<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */
$routes->get('/', 'Home::index');

// Handle CORS preflight for all API routes
$routes->options('api/(:any)', function () {
    $response = service('response');
    $response->setStatusCode(200);
    return $response;
});

$routes->group('api', ['namespace' => 'App\Controllers\Api'], function ($routes) {
    $routes->get('remitters/potential-matches', 'Remitters::potentialMatches');
    $routes->resource('remitters');
    $routes->post('remitters/(:num)/veriff/start', 'Remitters::startVeriff/$1');
    $routes->post('remitters/(:num)/veriff/sync', 'Remitters::syncVeriff/$1');
    $routes->resource('beneficiaries');
    $routes->resource('transfers');
    $routes->post('transfers/(:num)/approve', 'Transfers::approve/$1');
    $routes->post('transfers/(:num)/cancel', 'Transfers::cancel/$1');
    $routes->resource('users');
    $routes->resource('currencies');
    $routes->resource('branch-currency-rates', ['controller' => 'BranchCurrencyRates']);
    $routes->resource('branch-access-requests', ['controller' => 'BranchAccessRequests']);
    $routes->post('branch-access-requests/check', 'BranchAccessRequests::check');
    $routes->post('branch-access-requests/(:num)/approve', 'BranchAccessRequests::approve/$1');
    $routes->post('branch-access-requests/(:num)/reject', 'BranchAccessRequests::reject/$1');
    $routes->resource('branches');
    $routes->resource('roles');
    $routes->resource('logs');
    $routes->post('logs/signoff', 'Logs::signoff');
    $routes->resource('audit-logs', ['controller' => 'AuditLogs']);
    $routes->resource('permission-groups', ['controller' => 'PermissionGroups']);
    $routes->post('permission-groups/import', 'PermissionGroups::import');
    $routes->resource('directors');
    $routes->resource('countries');
    $routes->resource('banks');
    $routes->resource('purposes');
    $routes->resource('relationships');
    $routes->get('transaction-settings', 'TransactionSettings::index');
    $routes->put('transaction-settings', 'TransactionSettings::update');
    $routes->get('mobile-admin/overview', 'MobileAdmin::overview');
    $routes->get('mobile-admin/settings', 'MobileAdmin::settings');
    $routes->put('mobile-admin/settings', 'MobileAdmin::updateSettings');
    $routes->get('mobile-admin/exchange-rates', 'MobileAdmin::exchangeRates');
    $routes->post('mobile-admin/exchange-rates', 'MobileAdmin::createExchangeRate');
    $routes->put('mobile-admin/exchange-rates/(:num)', 'MobileAdmin::updateExchangeRate/$1');
    $routes->delete('mobile-admin/exchange-rates/(:num)', 'MobileAdmin::deleteExchangeRate/$1');
    $routes->get('mobile-admin/review-queue', 'MobileAdmin::reviewQueue');
    $routes->post('mobile-admin/review-queue/(:num)/approve', 'MobileAdmin::approveQueueUser/$1');
    $routes->post('mobile-admin/review-queue/(:num)/reject', 'MobileAdmin::rejectQueueUser/$1');
    $routes->get('mobile-admin/transfers', 'MobileAdmin::walletTransfers');
    $routes->put('mobile-admin/transfers/(:num)', 'MobileAdmin::updateWalletTransfer/$1');
    $routes->get('mobile-admin/campaigns', 'MobileAdmin::campaigns');
    $routes->post('mobile-admin/campaigns', 'MobileAdmin::createCampaign');
    $routes->post('mobile-admin/campaigns/(:num)/send', 'MobileAdmin::sendCampaign/$1');
    $routes->get('mobile-admin/ads', 'MobileAdmin::ads');
    $routes->post('mobile-admin/ads', 'MobileAdmin::createAd');
    $routes->put('mobile-admin/ads/(:num)', 'MobileAdmin::updateAd/$1');
    $routes->delete('mobile-admin/ads/(:num)', 'MobileAdmin::deleteAd/$1');
    $routes->get('reports/summary', 'Reports::summary');
    $routes->get('reports/trends', 'Reports::trends');
    $routes->get('support/tickets', 'Support::index');
    $routes->get('support/tickets/mine', 'Support::mine');
    $routes->get('support/tickets/(:num)', 'Support::show/$1');
    $routes->post('support/tickets', 'Support::create');
    $routes->put('support/tickets/(:num)', 'Support::update/$1');
    $routes->delete('support/tickets/(:num)', 'Support::delete/$1');
    $routes->post('support/tickets/(:num)/reply', 'Support::reply/$1');
    $routes->post('support/tickets/(:num)/user-reply', 'Support::userReply/$1');
    $routes->post('login', 'Auth::login');
    $routes->post('registerapp', 'Auth::registerApp');
    $routes->post('auth/verify-email', 'Auth::verifyEmail');
    $routes->post('auth/resend-otp', 'Auth::resendOtp');
    $routes->post('auth/mobile-otp/request', 'Auth::requestMobileOtp');
    $routes->post('auth/mobile-otp/verify', 'Auth::verifyMobileOtp');
    $routes->post('auth/mobile-otp/confirm', 'Auth::confirmFirebasePhone');
    $routes->post('auth/kyc-status', 'Auth::getKycStatus');
    $routes->get('auth/mobile-config', 'Auth::mobileConfig');
    $routes->get('auth/mobile-exchange-rates', 'Auth::mobileExchangeRates');
    $routes->post('auth/liveness/start', 'Auth::startLiveness');
    $routes->post('auth/liveness/sync', 'Auth::syncLivenessDecision');
    $routes->post('auth/sanction/screen', 'Auth::screenSanction');
    $routes->post('loginapp', 'Auth::loginApp');
    $routes->post('auth/update-kyc-status', 'Auth::updateKycStatus');
    $routes->post('auth/remitter-details', 'Auth::getRemitterByEmail');
    $routes->post('auth/update-profile', 'Auth::updateRemitterProfile');
    $routes->post('auth/profile-photo', 'Auth::uploadProfilePhoto');
    $routes->post('auth/forgot-password', 'Auth::forgotPassword');
    $routes->post('auth/verify-reset-otp', 'Auth::verifyResetOtp');
    $routes->post('auth/reset-password', 'Auth::resetPassword');
    $routes->post('auth/change-password', 'Auth::changePassword');
    $routes->post('auth/device/verify', 'Auth::verifyDeviceLogin');
    $routes->post('auth/device/push-token', 'Auth::registerPushToken');
    $routes->delete('auth/device/push-token', 'Auth::removePushToken');
    $routes->post('auth/delete-account', 'Auth::deleteAccount');
    $routes->post('auth/trust-payments/session', 'Auth::startTrustPaymentsSession');
    $routes->post('trust-payments/notify', 'TrustPayments::notify');
    $routes->get('auth/beneficiaries', 'Auth::listMobileBeneficiaries');
    $routes->post('auth/beneficiaries', 'Auth::createMobileBeneficiary');
    $routes->put('auth/beneficiaries/(:num)', 'Auth::updateMobileBeneficiary/$1');
    $routes->delete('auth/beneficiaries/(:num)', 'Auth::deleteMobileBeneficiary/$1');
    $routes->post('auth/beneficiaries/(:num)/status', 'Auth::setMobileBeneficiaryStatus/$1');
    $routes->get('auth/transfers', 'Auth::listMobileTransfers');
    $routes->post('auth/transfers', 'Auth::createMobileTransfer');
    $routes->post('auth/transfers/(:num)/funding', 'Auth::submitMobileTransferFunding/$1');
    $routes->post('auth/check-status', 'Auth::checkStatus');
    $routes->post('webhooks/veriff', 'Auth::veriffWebhook');
});
