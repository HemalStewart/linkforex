<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class TrustPayments extends ResourceController
{
    protected $format = 'json';

    public function notify()
    {
        $expected = (string) (getenv('TRUST_PAYMENTS_WEBHOOK_SECRET') ?: '');
        if (trim($expected) === '') {
            return $this->respond([
                'status' => 503,
                'message' => 'Trust Payments webhook is not configured.',
            ], 503);
        }

        $provided = (string) ($this->request->getHeaderLine('X-TrustPayments-Webhook-Secret') ?: '');
        if (!hash_equals($expected, $provided)) {
            return $this->fail('Unauthorized', 401);
        }

        $payload = $this->request->getPost() ?? [];
        if (!is_array($payload)) {
            $payload = [];
        }

        $transferId = (int) ($this->request->getVar('transfer_id') ?? 0);
        $orderReference = trim((string) ($this->request->getVar('orderreference') ?? ($payload['orderreference'] ?? '')));

        $model = new \App\Models\TransferModel();
        $transfer = null;
        if ($transferId > 0) {
            $transfer = $model->find($transferId);
        }

        // Fallback: map by our transfer code (mobile/web reference) when transfer_id isn't present.
        if (!$transfer && $orderReference !== '') {
            $transfer = $model
                ->where('code', $orderReference)
                ->orderBy('id', 'DESC')
                ->first();
            if ($transfer) {
                $transferId = (int) ($transfer['id'] ?? 0);
            }
        }

        if (!$transfer) {
            return $this->fail([
                'transfer_id' => $transferId > 0 ? null : 'transfer_id is missing.',
                'orderreference' => $orderReference !== '' ? null : 'orderreference is missing.',
                'message' => 'Transfer not found for webhook payload.',
            ], 422);
        }

        $meta = [];
        if (!empty($transfer['meta_json'])) {
            $decoded = json_decode((string) $transfer['meta_json'], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $meta = $decoded;
            }
        }

        $now = date('Y-m-d H:i:s');
        $tpHistory = is_array($meta['trust_payments_history'] ?? null) ? $meta['trust_payments_history'] : [];
        $tpHistory[] = [
            'received_at' => $now,
            'payload' => $payload,
        ];
        $meta['trust_payments_history'] = $tpHistory;

        // Best-effort "payment reference" - Trust Payments calls this transactionreference.
        $transactionRef = trim((string) ($payload['transactionreference'] ?? ''));
        if ($transactionRef !== '') {
            $meta['payment_reference'] = $transactionRef;
            $meta['transaction_id'] = $transactionRef;
        }

        $errorcode = (int) ($payload['errorcode'] ?? 99999);
        $nextStatus = strtolower(trim((string) ($transfer['status'] ?? 'awaiting_funds')));
        if ($errorcode === 0) {
            $nextStatus = 'funds_received';
            $meta['trust_payments_received_at'] = $meta['trust_payments_received_at'] ?? $now;
        }

        $update = [
            'status' => $nextStatus,
            'meta_json' => json_encode($meta, JSON_UNESCAPED_UNICODE),
        ];

        if (!$model->update($transferId, $update)) {
            return $this->fail($model->errors());
        }

        $updated = $model->find($transferId) ?? array_merge($transfer, $update);

        return $this->respond([
            'status' => 200,
            'message' => 'Webhook received.',
            'data' => $updated,
        ]);
    }
}
