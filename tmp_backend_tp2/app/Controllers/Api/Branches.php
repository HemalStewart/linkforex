<?php

namespace App\Controllers\Api;

use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use App\Controllers\Api\Concerns\ResolvesActingUser;

class Branches extends ResourceController
{
    use ResolvesActingUser;

    protected $modelName = 'App\Models\Branch';
    protected $format    = 'json';

    private function branchSections(): array
    {
        return ['BRANCH', 'BRANCHES'];
    }

    private function normalizePayload(array $data): array
    {
        if (!isset($data['telephone_1']) && isset($data['phone'])) {
            $data['telephone_1'] = $data['phone'];
        }
        if (!isset($data['phone']) && isset($data['telephone_1'])) {
            $data['phone'] = $data['telephone_1'];
        }
        if (!isset($data['transaction_prefix']) && isset($data['code'])) {
            $data['transaction_prefix'] = $data['code'];
        }
        if (!isset($data['code']) && isset($data['transaction_prefix'])) {
            $data['code'] = $data['transaction_prefix'];
        }
        if (empty($data['address']) && !empty($data['address_line_1'])) {
            $parts = [
                $data['building_number'] ?? null,
                $data['address_line_1'] ?? null,
                $data['city'] ?? null,
                $data['postcode'] ?? null,
                $data['country'] ?? null,
            ];
            $data['address'] = trim(implode(', ', array_filter($parts)));
        }

        return $data;
    }

    private function isAllowedCountryName(?string $countryName): bool
    {
        $countryName = strtolower(trim((string) $countryName));
        if ($countryName === '') {
            return true;
        }

        $countryModel = new \App\Models\CountryModel();
        $rows = $countryModel
            ->select('name')
            ->where('status', 'active')
            ->findAll();

        foreach ($rows as $row) {
            if (strtolower(trim((string) ($row['name'] ?? ''))) === $countryName) {
                return true;
            }
        }

        return false;
    }

    private function branchLookupValues(array $branch): array
    {
        $values = [
            $branch['id'] ?? null,
            $branch['code'] ?? null,
            $branch['transaction_prefix'] ?? null,
            $branch['name'] ?? null,
        ];

        return array_values(array_unique(array_filter(array_map(static function ($value) {
            return trim((string) $value);
        }, $values), static function ($value) {
            return $value !== '';
        })));
    }

    private function countRegisteredUsersForBranch(array $branch): array
    {
        $values = $this->branchLookupValues($branch);
        if (empty($values)) {
            return [
                'admin_users' => 0,
                'remitters' => 0,
                'total' => 0,
            ];
        }

        $db = db_connect();

        $userBuilder = $db->table('users');
        $userBuilder->groupStart()
            ->whereIn('branch', $values)
            ->orWhereIn('branch_id', $values)
            ->groupEnd();
        $adminUsers = (int) $userBuilder->countAllResults();

        $remitterBuilder = $db->table('remitters');
        $remitterBuilder->whereIn('branch', $values);
        $remitters = (int) $remitterBuilder->countAllResults();

        return [
            'admin_users' => $adminUsers,
            'remitters' => $remitters,
            'total' => $adminUsers + $remitters,
        ];
    }

    public function index()
    {
        if (!$this->hasPermission($this->branchSections(), 'VIEW')) {
            return $this->failForbidden('You do not have permission to view branches.');
        }

        $branches = $this->model->findAll();
        $userModel = new \App\Models\UserModel();
        $transferModel = new \App\Models\TransferModel();

        // Calculate real staff counts and transfer stats
        foreach ($branches as &$branch) {
            // Staff Count
            $count = $userModel
                ->groupStart()
                    ->where('branch', $branch['code'])
                    ->orWhere('branch', $branch['name'])
                ->groupEnd()
                ->countAllResults();
            $branch['staff_count'] = $count;

            // Transfers Stats
            $branchCode = $branch['code'];
            $branch['transfers'] = $transferModel->where('branch_id', $branchCode)->countAllResults();
            
            // Revenue (Sum of source_amount)
            $revenueQuery = $transferModel->selectSum('source_amount')->where('branch_id', $branchCode)->get()->getRow();
            $revenue = $revenueQuery->source_amount ?? 0;
            
            $branch['revenue'] = '£' . number_format((float)$revenue, 2);
            $branch['revenue_raw'] = (float)$revenue;

            if (!isset($branch['telephone_1']) && isset($branch['phone'])) {
                $branch['telephone_1'] = $branch['phone'];
            }
            if (!isset($branch['transaction_prefix']) && isset($branch['code'])) {
                $branch['transaction_prefix'] = $branch['code'];
            }
        }

        return $this->respond($branches);
    }

    public function show($id = null)
    {
        if (!$this->hasPermission($this->branchSections(), 'VIEW')) {
            return $this->failForbidden('You do not have permission to view branches.');
        }

        $data = $this->model->find($id);
        if ($data) {
            return $this->respond($data);
        }
        return $this->failNotFound('Branch not found');
    }

    public function create()
    {
        if (!$this->hasPermission($this->branchSections(), 'CREATE')) {
            return $this->failForbidden('You do not have permission to create branches.');
        }

        $data = $this->request->getJSON(true) ?? $this->request->getPost();
        $data = $this->normalizePayload($data);

        if (!$this->isAllowedCountryName($data['country'] ?? null)) {
            return $this->fail(['country' => 'Selected country is not available in Countries.'], 422);
        }
        
        if ($id = $this->model->insert($data)) {
            $data['id'] = $id;
            return $this->respondCreated($data);
        }

        return $this->fail($this->model->errors());
    }

    public function update($id = null)
    {
        if (!$this->hasPermission($this->branchSections(), 'EDIT')) {
            return $this->failForbidden('You do not have permission to update branches.');
        }

        $data = $this->request->getJSON(true) ?? $this->request->getRawInput();
        $data = $this->normalizePayload($data);

        if (!$this->isAllowedCountryName($data['country'] ?? null)) {
            return $this->fail(['country' => 'Selected country is not available in Countries.'], 422);
        }
        
        if ($this->model->update($id, $data)) {
            return $this->respond($this->model->find($id));
        }
        return $this->fail($this->model->errors());
    }

    public function delete($id = null)
    {
        if (!$this->hasPermission($this->branchSections(), 'DELETE')) {
            return $this->failForbidden('You do not have permission to delete branches.');
        }

        $branch = $this->model->find($id);
        if (!$branch) {
            return $this->failNotFound('Branch not found');
        }

        $registeredUsers = $this->countRegisteredUsersForBranch($branch);
        if (($registeredUsers['total'] ?? 0) > 0) {
            return $this->respond([
                'status' => 409,
                'error' => 409,
                'messages' => [
                    'error' => 'Cannot delete this branch because registered users are assigned to it.',
                ],
                'registered_users' => $registeredUsers,
            ], 409);
        }

        if ($this->model->delete($id)) {
            return $this->respondDeleted(['id' => $id]);
        }
        return $this->fail('Failed to delete branch');
    }
}
