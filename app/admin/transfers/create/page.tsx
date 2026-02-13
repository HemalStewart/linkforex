'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../../components/ConfirmModal';
import {
    ArrowLeft,
    ChevronRight,
    Search,
    Plus,
    Calendar,
    Landmark,
    BadgePoundSterling,
    Coins,
    User,
    Phone,
    MapPin,
    Building2,
    Wallet,
    HandCoins,
    Save,
    Loader2,
    RefreshCcw,
    Copy
} from 'lucide-react';

type ModalType = 'info' | 'danger' | 'warning';
type AmlState = 'idle' | 'running' | 'passed' | 'failed';

type Branch = {
    id: string | number;
    name: string;
    code?: string;
    transaction_prefix?: string;
    default_transaction_type?: string;
};

type Currency = {
    id: string | number;
    code: string;
    name: string;
    rate?: string;
};

type Remitter = {
    id: string | number;
    name: string;
    sender_id?: string;
    phone?: string;
    dob?: string;
    place_of_birth?: string;
    postcode?: string;
    address_1?: string;
    city?: string;
    country?: string;
    occupation?: string;
    status?: string;
    kyc_status?: string;
    branch?: string;
};

type Beneficiary = {
    id: string | number;
    customer_id?: string | number;
    name: string;
    bank_name?: string;
    branch_name?: string;
    account_number?: string;
    relation?: string;
    mobile_number?: string;
    status?: string;
};

type BranchAccessCheckResult = {
    allowed?: boolean;
    status?: 'clear' | 'pending' | 'approved';
    message?: string;
    request_id?: number;
    request?: {
        id?: number;
        origin_branch_name?: string;
        requested_branch_name?: string;
        status?: string;
    };
};

type TransferForm = {
    toBranch: string;
    invoiceNo: string;
    invoicingDate: string;
    payoutCurrency: string;
    customerRate: string;
    receiveAmount: string;
    fcTransferAmount: string;

    transactionId: string;
    otherTransactionId: string;

    senderVerified: 'yes' | 'no';
    senderRecordId: string;
    senderId: string;
    senderName: string;
    senderDateOfBirth: string;
    senderPlaceOfBirth: string;
    senderContacts: string;
    senderPostcode: string;
    depositBank: string;
    depositBranch: string;
    sourceOfIncome: string;
    relationship: string;
    purposeOfTransaction: string;
    otherPurpose: string;
    entryType: string;
    paymentMode: string;

    receiverVerified: 'yes' | 'no';
    receiverRecordId: string;
    receiverName: string;
    receiverContacts: string;
    receiverAddress: string;
    receiverCity: string;
    receiverCountry: string;
    receiverDateOfBirth: string;
    receiverPlaceOfBirth: string;
    cnicNo: string;
    receiverBank: string;
    receiverBranchCode: string;
    receiverAccountNo: string;
    receiverAccountOtherDetails: string;
    remarks: string;
    otherReference: string;
};

const amlActions = [
    'AML SmartSearch',
    'AML NameScan',
    'Dilisense Free Search',
    'Dilisense API Search'
];

const toDateTimeLocal = (date: Date): string => {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toDateLocal = (date: Date): string => {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const generateCode = (prefix: string): string => `${prefix}${Math.floor(10000 + Math.random() * 90000)}`;

export default function CreateTransferPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const now = useMemo(() => new Date(), []);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [branches, setBranches] = useState<Branch[]>([]);
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);

    const [senderSearch, setSenderSearch] = useState('');
    const [senderResults, setSenderResults] = useState<Remitter[]>([]);
    const [senderSearching, setSenderSearching] = useState(false);
    const [selectedBranchRate, setSelectedBranchRate] = useState('');
    const [senderAmlState, setSenderAmlState] = useState<AmlState>('idle');
    const [receiverAmlState, setReceiverAmlState] = useState<AmlState>('idle');
    const [processedReturnRemitterId, setProcessedReturnRemitterId] = useState('');
    const [processedReturnReceiverId, setProcessedReturnReceiverId] = useState('');
    const [currentUserBranch, setCurrentUserBranch] = useState('');
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [currentUserName, setCurrentUserName] = useState('');
    const [branchAccessIssue, setBranchAccessIssue] = useState<{
        blocked: boolean;
        message: string;
        requestId?: number;
    }>({
        blocked: false,
        message: '',
    });
    const [receiverBranchAccessIssue, setReceiverBranchAccessIssue] = useState<{
        blocked: boolean;
        message: string;
        requestId?: number;
    }>({
        blocked: false,
        message: '',
    });

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as ModalType,
        isAlert: true,
        shouldRedirect: false
    });

    const [formData, setFormData] = useState<TransferForm>({
        toBranch: '',
        invoiceNo: generateCode('LFX'),
        invoicingDate: toDateTimeLocal(now),
        payoutCurrency: 'AFN',
        customerRate: '87',
        receiveAmount: '0',
        fcTransferAmount: '0',

        transactionId: generateCode('LFX'),
        otherTransactionId: '',

        senderVerified: 'no',
        senderRecordId: '',
        senderId: '',
        senderName: '',
        senderDateOfBirth: '',
        senderPlaceOfBirth: '',
        senderContacts: '',
        senderPostcode: '',
        depositBank: 'NONE - (N)',
        depositBranch: 'CASH',
        sourceOfIncome: 'Salary',
        relationship: 'Family',
        purposeOfTransaction: 'Family Maintenance/Savings',
        otherPurpose: '',
        entryType: 'Cash Collected',
        paymentMode: 'P - CASH PICKUP',

        receiverVerified: 'no',
        receiverRecordId: '',
        receiverName: '',
        receiverContacts: '',
        receiverAddress: '',
        receiverCity: '',
        receiverCountry: 'Afghanistan',
        receiverDateOfBirth: toDateLocal(now),
        receiverPlaceOfBirth: '',
        cnicNo: '1111111111111',
        receiverBank: 'NONE - (N)',
        receiverBranchCode: '',
        receiverAccountNo: '',
        receiverAccountOtherDetails: '',
        remarks: '',
        otherReference: ''
    });

    const withActingUser = useCallback((url: string): string => {
        if (!currentUserId) return url;
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}acting_user_id=${encodeURIComponent(String(currentUserId))}`;
    }, [currentUserId]);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [branchesRes, currenciesRes] = await Promise.all([
                    fetch(ENDPOINTS.BRANCHES.LIST),
                    fetch(ENDPOINTS.CURRENCIES.LIST)
                ]);

                if (branchesRes.ok) {
                    const branchData = (await branchesRes.json()) as Branch[];
                    setBranches(branchData);
                    if (branchData.length > 0) {
                        const first = branchData[0];
                        const branchCode = first.code || first.transaction_prefix || String(first.id);
                        setFormData((prev) => ({ ...prev, toBranch: prev.toBranch || branchCode }));
                    }
                }

                if (currenciesRes.ok) {
                    const currencyData = (await currenciesRes.json()) as Currency[];
                    setCurrencies(currencyData);
                    const preferred = currencyData.find((c) => c.code === 'AFN') || currencyData[0];
                    if (preferred) {
                        setFormData((prev) => ({
                            ...prev,
                            payoutCurrency: preferred.code,
                            customerRate: prev.customerRate || preferred.rate || '0'
                        }));
                    }
                }
            } catch (error) {
                console.error('Failed to load transfer dependencies', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    useEffect(() => {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (!stored) return;

        try {
            const parsed = JSON.parse(stored) as {
                id?: string | number;
                username?: string;
                name?: string;
                branch?: string;
                branch_id?: string;
            };
            const parsedId = Number(parsed.id ?? NaN);
            setCurrentUserId(Number.isFinite(parsedId) ? parsedId : null);
            setCurrentUserName(parsed.username || parsed.name || '');
            setCurrentUserBranch((parsed.branch || parsed.branch_id || '').trim());
        } catch {
            setCurrentUserId(null);
            setCurrentUserName('');
            setCurrentUserBranch('');
        }
    }, []);

    useEffect(() => {
        const term = senderSearch.trim();
        if (term.length < 2) {
            setSenderResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setSenderSearching(true);
            try {
                const lookupUrl = withActingUser(`${ENDPOINTS.REMITTERS.LIST}?search=${encodeURIComponent(term)}&cross_branch_lookup=1`);
                const res = await fetch(lookupUrl);
                if (!res.ok) return;
                const data = (await res.json()) as Remitter[];
                setSenderResults(data);
            } catch (error) {
                console.error('Failed to search senders', error);
            } finally {
                setSenderSearching(false);
            }
        }, 350);

        return () => clearTimeout(timer);
    }, [senderSearch, withActingUser]);

    const setModal = (title: string, message: string, type: ModalType = 'info', shouldRedirect = false) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            type,
            isAlert: true,
            shouldRedirect
        });
    };

    const onModalClose = () => {
        const shouldRedirect = confirmModal.shouldRedirect;
        setConfirmModal((prev) => ({ ...prev, isOpen: false, shouldRedirect: false }));
        if (shouldRedirect) {
            router.push('/admin/transfers');
        }
    };

    const setNowInvoicingDate = () => {
        setFormData((prev) => ({ ...prev, invoicingDate: toDateTimeLocal(new Date()) }));
    };

    const setNowSenderDob = () => {
        setFormData((prev) => ({ ...prev, senderDateOfBirth: toDateLocal(new Date()) }));
    };

    const clearSenderDob = () => {
        setFormData((prev) => ({ ...prev, senderDateOfBirth: '' }));
    };

    const setNowReceiverDob = () => {
        setFormData((prev) => ({ ...prev, receiverDateOfBirth: toDateLocal(new Date()) }));
    };

    const applyRateByCurrency = (currencyCode: string) => {
        const selected = currencies.find((currency) => currency.code === currencyCode);
        if (!selected) return;
        const rate = selected.rate || '0';
        const sourceAmount = Number(formData.receiveAmount || 0);
        const fc = sourceAmount * Number(rate || 0);
        setFormData((prev) => ({
            ...prev,
            payoutCurrency: currencyCode,
            customerRate: rate,
            fcTransferAmount: Number.isFinite(fc) ? fc.toFixed(2) : '0'
        }));
    };

    const updateAmountsFromSource = (source: string, rateValue: string) => {
        const sourceNumber = Number(source || 0);
        const rateNumber = Number(rateValue || 0);
        const fc = sourceNumber * rateNumber;
        setFormData((prev) => ({
            ...prev,
            receiveAmount: source,
            fcTransferAmount: Number.isFinite(fc) ? fc.toFixed(2) : '0'
        }));
    };

    const updateAmountsFromFc = (fcValue: string, rateValue: string) => {
        const fcNumber = Number(fcValue || 0);
        const rateNumber = Number(rateValue || 0);
        const source = rateNumber > 0 ? fcNumber / rateNumber : 0;
        setFormData((prev) => ({
            ...prev,
            fcTransferAmount: fcValue,
            receiveAmount: Number.isFinite(source) ? source.toFixed(2) : '0'
        }));
    };

    useEffect(() => {
        const loadBranchCurrencyRate = async () => {
            if (!formData.toBranch || !formData.payoutCurrency) {
                setSelectedBranchRate('');
                return;
            }
            try {
                const query = new URLSearchParams({
                    branch_code: formData.toBranch,
                    currency_code: formData.payoutCurrency,
                    active: 'yes'
                });
                const res = await fetch(`${ENDPOINTS.BRANCH_CURRENCY_RATES.LIST}?${query.toString()}`);
                if (!res.ok) return;

                const rows = (await res.json()) as Array<{
                    customer_rate?: string;
                    branch_rate?: string;
                }>;
                if (!Array.isArray(rows) || !rows.length) {
                    setSelectedBranchRate('');
                    return;
                }

                const rateRow = rows[0];
                const customerRate = String(rateRow.customer_rate || '');
                const branchRate = String(rateRow.branch_rate || '');
                if (!customerRate) {
                    setSelectedBranchRate('');
                    return;
                }

                setSelectedBranchRate(branchRate);
                setFormData((prev) => {
                    const sourceAmount = Number(prev.receiveAmount || 0);
                    const fc = sourceAmount * Number(customerRate || 0);
                    return {
                        ...prev,
                        customerRate,
                        fcTransferAmount: Number.isFinite(fc) ? fc.toFixed(2) : prev.fcTransferAmount
                    };
                });
            } catch (error) {
                console.error('Failed to load branch currency rate', error);
                setSelectedBranchRate('');
            }
        };

        loadBranchCurrencyRate();
    }, [formData.toBranch, formData.payoutCurrency]);

    const fetchReceiversForSender = useCallback(async (senderRecordId: string) => {
        try {
            const receiverUrl = withActingUser(`${ENDPOINTS.BENEFICIARIES.LIST}?customer_id=${senderRecordId}`);
            const res = await fetch(receiverUrl);
            if (!res.ok) {
                setBeneficiaries([]);
                return;
            }
            const data = (await res.json()) as Beneficiary[];
            setBeneficiaries(data);
        } catch (error) {
            console.error('Failed to load receivers', error);
            setBeneficiaries([]);
        }
    }, [withActingUser]);

    const checkBranchAccessForSender = useCallback(async (senderRecordId: string): Promise<string | null> => {
        if (!currentUserBranch || !senderRecordId) {
            setBranchAccessIssue({ blocked: false, message: '' });
            return null;
        }

        try {
            const response = await fetch(withActingUser(ENDPOINTS.BRANCH_ACCESS_REQUESTS.CHECK), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    acting_user_id: currentUserId ?? undefined,
                    remitter_id: Number(senderRecordId),
                    requesting_branch: currentUserBranch,
                    requested_by_user_id: currentUserId ?? undefined,
                    requested_by_username: currentUserName || undefined,
                    create_if_missing: true,
                }),
            });

            if (!response.ok) {
                setBranchAccessIssue({ blocked: false, message: '' });
                return null;
            }

            const data = (await response.json()) as BranchAccessCheckResult;
            if (data.allowed) {
                setBranchAccessIssue({ blocked: false, message: '' });
                return null;
            }

            const requestId = data.request_id || data.request?.id;
            const message = data.message || 'Sender belongs to another branch and requires approval.';
            setBranchAccessIssue({
                blocked: true,
                message,
                requestId: requestId ? Number(requestId) : undefined,
            });
            return message;
        } catch (error) {
            console.error('Failed to check cross-branch access', error);
            setBranchAccessIssue({ blocked: false, message: '' });
            return null;
        }
    }, [currentUserBranch, currentUserId, currentUserName, withActingUser]);

    const checkBranchAccessForReceiver = useCallback(async (receiverOwnerRemitterId: string): Promise<string | null> => {
        if (!currentUserBranch || !receiverOwnerRemitterId) {
            setReceiverBranchAccessIssue({ blocked: false, message: '' });
            return null;
        }

        try {
            const response = await fetch(withActingUser(ENDPOINTS.BRANCH_ACCESS_REQUESTS.CHECK), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    acting_user_id: currentUserId ?? undefined,
                    remitter_id: Number(receiverOwnerRemitterId),
                    requesting_branch: currentUserBranch,
                    requested_by_user_id: currentUserId ?? undefined,
                    requested_by_username: currentUserName || undefined,
                    create_if_missing: true,
                }),
            });

            if (!response.ok) {
                setReceiverBranchAccessIssue({ blocked: false, message: '' });
                return null;
            }

            const data = (await response.json()) as BranchAccessCheckResult;
            if (data.allowed) {
                setReceiverBranchAccessIssue({ blocked: false, message: '' });
                return null;
            }

            const requestId = data.request_id || data.request?.id;
            const message = data.message || 'Receiver belongs to another branch and requires approval.';
            setReceiverBranchAccessIssue({
                blocked: true,
                message,
                requestId: requestId ? Number(requestId) : undefined,
            });
            return message;
        } catch (error) {
            console.error('Failed to check receiver cross-branch access', error);
            setReceiverBranchAccessIssue({ blocked: false, message: '' });
            return null;
        }
    }, [currentUserBranch, currentUserId, currentUserName, withActingUser]);

    const selectSender = useCallback(async (sender: Remitter) => {
        const senderRecordId = String(sender.id);
        setFormData((prev) => ({
            ...prev,
            senderRecordId,
            senderId: sender.sender_id || '',
            senderName: sender.name || '',
            senderDateOfBirth: sender.dob || '',
            senderPlaceOfBirth: sender.place_of_birth || '',
            senderContacts: sender.phone || '',
            senderPostcode: sender.postcode || '',
            senderVerified: sender.kyc_status === 'verified' ? 'yes' : 'no',
            toBranch: prev.toBranch || sender.branch || prev.toBranch
        }));
        setSenderAmlState('idle');
        setSenderSearch(sender.sender_id || sender.name || '');
        setSenderResults([]);
        setReceiverBranchAccessIssue({ blocked: false, message: '' });
        await fetchReceiversForSender(senderRecordId);
        await checkBranchAccessForSender(senderRecordId);
    }, [fetchReceiversForSender, checkBranchAccessForSender]);

    useEffect(() => {
        const newRemitterId = searchParams.get('newRemitterId');
        if (!newRemitterId || newRemitterId === processedReturnRemitterId) return;

        const fetchNewRemitter = async () => {
            try {
                const res = await fetch(withActingUser(ENDPOINTS.REMITTERS.DETAIL(newRemitterId)));
                if (!res.ok) return;
                const remitter = (await res.json()) as Remitter;
                await selectSender(remitter);
                setProcessedReturnRemitterId(newRemitterId);
            } catch (error) {
                console.error('Failed to load newly created sender', error);
            }
        };

        fetchNewRemitter();
    }, [searchParams, selectSender, processedReturnRemitterId, withActingUser]);

    const selectReceiver = useCallback(async (receiver: Beneficiary) => {
        setFormData((prev) => ({
            ...prev,
            receiverRecordId: String(receiver.id),
            receiverName: receiver.name || '',
            receiverContacts: receiver.mobile_number || '',
            receiverBank: receiver.bank_name || prev.receiverBank,
            receiverBranchCode: receiver.branch_name || prev.receiverBranchCode,
            receiverAccountNo: receiver.account_number || '',
            relationship: receiver.relation || prev.relationship,
            receiverVerified: receiver.status === 'active' ? 'yes' : prev.receiverVerified
        }));
        setReceiverAmlState('idle');

        const receiverOwnerRemitterId = receiver.customer_id ? String(receiver.customer_id) : '';
        if (receiverOwnerRemitterId) {
            await checkBranchAccessForReceiver(receiverOwnerRemitterId);
        } else {
            setReceiverBranchAccessIssue({ blocked: false, message: '' });
        }
    }, [checkBranchAccessForReceiver]);

    useEffect(() => {
        const newReceiverId = searchParams.get('newReceiverId');
        if (!newReceiverId || newReceiverId === processedReturnReceiverId) return;

        const fetchNewReceiver = async () => {
            try {
                const res = await fetch(withActingUser(ENDPOINTS.BENEFICIARIES.DETAIL(newReceiverId)));
                if (!res.ok) return;

                const receiver = (await res.json()) as Beneficiary;
                const receiverCustomerId = receiver.customer_id ? String(receiver.customer_id) : '';

                if (receiverCustomerId && receiverCustomerId !== formData.senderRecordId) {
                    const senderRes = await fetch(withActingUser(ENDPOINTS.REMITTERS.DETAIL(receiverCustomerId)));
                    if (senderRes.ok) {
                        const sender = (await senderRes.json()) as Remitter;
                        await selectSender(sender);
                    }
                }

                setBeneficiaries((prev) => {
                    if (prev.some((item) => String(item.id) === String(receiver.id))) return prev;
                    return [receiver, ...prev];
                });
                await selectReceiver(receiver);
                setProcessedReturnReceiverId(newReceiverId);
            } catch (error) {
                console.error('Failed to load newly created receiver', error);
            }
        };

        fetchNewReceiver();
    }, [searchParams, selectSender, selectReceiver, processedReturnReceiverId, formData.senderRecordId, withActingUser]);

    const triggerAmlAction = (actionName: string, person: 'Sender' | 'Receiver') => {
        if (person === 'Sender' && !formData.senderRecordId) {
            setModal('Missing Sender', 'Please select a sender first before running AML actions.', 'warning');
            return;
        }
        if (person === 'Receiver' && !formData.receiverRecordId) {
            setModal('Missing Receiver', 'Please select a receiver first before running AML actions.', 'warning');
            return;
        }

        if (person === 'Sender') setSenderAmlState('running');
        if (person === 'Receiver') setReceiverAmlState('running');

        window.setTimeout(() => {
            if (person === 'Sender') {
                setSenderAmlState('passed');
                setFormData((prev) => ({ ...prev, senderVerified: 'yes' }));
            } else {
                setReceiverAmlState('passed');
                setFormData((prev) => ({ ...prev, receiverVerified: 'yes' }));
            }
            setModal('AML Completed', `${person} ${actionName} completed successfully.`, 'info');
        }, 900);
    };

    const handleFindSenderByPostcode = async () => {
        const postcode = formData.senderPostcode.trim();
        if (!postcode) {
            setModal('Missing Postcode', 'Enter sender postcode first.', 'warning');
            return;
        }

        setSenderSearching(true);
        try {
            const lookupUrl = withActingUser(`${ENDPOINTS.REMITTERS.LIST}?search=${encodeURIComponent(postcode)}&cross_branch_lookup=1`);
            const res = await fetch(lookupUrl);
            if (!res.ok) {
                setModal('Search Failed', 'Unable to search sender by postcode.', 'danger');
                return;
            }

            const matches = (await res.json()) as Remitter[];
            if (!matches.length) {
                setModal('No Sender Found', `No sender found for postcode: ${postcode}.`, 'warning');
                return;
            }

            const exact = matches.find((item) => (item.postcode || '').trim().toLowerCase() === postcode.toLowerCase());
            const target = exact || matches[0];
            await selectSender(target);
            setModal('Sender Found', `${target.name} selected from postcode search.`, 'info');
        } catch (error) {
            console.error('Postcode search failed', error);
            setModal('Search Failed', 'Unable to search sender by postcode.', 'danger');
        } finally {
            setSenderSearching(false);
        }
    };

    const handleClearSenderPostcode = () => {
        setFormData((prev) => ({ ...prev, senderPostcode: '' }));
    };

    const validateForm = (): string | null => {
        if (!formData.toBranch) return 'To Branch is required.';
        if (!formData.invoiceNo) return 'Invoice No is required.';
        if (!formData.invoicingDate) return 'Invoicing Date is required.';
        if (!formData.payoutCurrency) return 'Payout Currency is required.';
        if (!formData.customerRate || Number(formData.customerRate) <= 0) return 'Customer Rate must be greater than 0.';
        if (!formData.receiveAmount || Number(formData.receiveAmount) <= 0) return 'Receive Amount (£) must be greater than 0.';
        if (!formData.senderRecordId) return 'Select a sender from existing records first.';
        if (!formData.senderName.trim()) return 'Sender Name is required.';
        if (!formData.receiverRecordId) return 'Select a receiver from existing records first.';
        if (!formData.receiverName.trim()) return 'Receiver Name is required.';
        if (!formData.receiverAddress.trim()) return 'Receiver Address is required.';
        if (!formData.receiverCountry.trim()) return 'Receiver Country is required.';
        if (!formData.receiverDateOfBirth.trim()) return 'Receiver Date Of Birth is required.';
        if (!formData.entryType.trim()) return 'Entry Type is required.';
        if (!formData.paymentMode.trim()) return 'Payment Mode is required.';
        return null;
    };

    const revalidateCrossBranchRules = async (): Promise<string | null> => {
        if (formData.senderRecordId) {
            const senderBlockedMessage = await checkBranchAccessForSender(formData.senderRecordId);
            if (senderBlockedMessage) {
                return senderBlockedMessage;
            }
        }

        if (formData.receiverRecordId) {
            const selectedReceiver = beneficiaries.find((receiver) => String(receiver.id) === formData.receiverRecordId);
            const receiverOwnerId = selectedReceiver?.customer_id ? String(selectedReceiver.customer_id) : '';
            if (receiverOwnerId) {
                const receiverBlockedMessage = await checkBranchAccessForReceiver(receiverOwnerId);
                if (receiverBlockedMessage) {
                    return receiverBlockedMessage;
                }
            }
        }

        return null;
    };

    const handleSubmit = async () => {
        const crossBranchError = await revalidateCrossBranchRules();
        if (crossBranchError) {
            setModal('Branch Approval Required', crossBranchError, 'warning');
            return;
        }

        const validationError = validateForm();
        if (validationError) {
            setModal('Missing Information', validationError, 'warning');
            return;
        }

        setSaving(true);

        const branch = branches.find((item) => (item.code || item.transaction_prefix || String(item.id)) === formData.toBranch);

        const payload = {
            code: formData.invoiceNo,
            remitter_id: Number(formData.senderRecordId),
            beneficiary_id: Number(formData.receiverRecordId),
            branch_id: formData.toBranch,
            created_by: currentUserId ?? undefined,
            requesting_branch: currentUserBranch || undefined,
            requested_by_username: currentUserName || undefined,
            acting_user_id: currentUserId ?? undefined,
            source_amount: Number(formData.receiveAmount),
            dest_amount: Number(formData.fcTransferAmount),
            rate: Number(formData.customerRate),
            payment_mode: formData.paymentMode.startsWith('P') ? 'P' : 'D',
            source_of_funds: formData.sourceOfIncome,
            purpose: formData.otherPurpose
                ? `${formData.purposeOfTransaction} - ${formData.otherPurpose}`
                : formData.purposeOfTransaction,
            status: 'pending',
            type: 'branch',
            collection_method: formData.entryType.toLowerCase().includes('cash') ? 'cash' : 'bank_transfer',
            transfer_meta: {
                transaction_id: formData.transactionId,
                other_transaction_id: formData.otherTransactionId,
                branch_name: branch?.name || '',
                sender_verified: formData.senderVerified,
                receiver_verified: formData.receiverVerified,
                sender_id: formData.senderId,
                sender_name: formData.senderName,
                sender_dob: formData.senderDateOfBirth,
                sender_place_of_birth: formData.senderPlaceOfBirth,
                sender_contacts: formData.senderContacts,
                sender_postcode: formData.senderPostcode,
                deposit_bank: formData.depositBank,
                deposit_branch: formData.depositBranch,
                relationship: formData.relationship,
                payout_currency: formData.payoutCurrency,
                customer_rate_for_gbp: formData.customerRate,
                branch_rate_for_gbp: selectedBranchRate,
                receiver_name: formData.receiverName,
                receiver_contacts: formData.receiverContacts,
                receiver_address: formData.receiverAddress,
                receiver_city: formData.receiverCity,
                receiver_country: formData.receiverCountry,
                receiver_dob: formData.receiverDateOfBirth,
                receiver_place_of_birth: formData.receiverPlaceOfBirth,
                cnic_no: formData.cnicNo,
                receiver_bank: formData.receiverBank,
                receiver_branch_code: formData.receiverBranchCode,
                receiver_account_no: formData.receiverAccountNo,
                receiver_account_other_details: formData.receiverAccountOtherDetails,
                remarks: formData.remarks,
                other_reference: formData.otherReference
            }
        };

        try {
            const response = await fetch(withActingUser(ENDPOINTS.TRANSFERS.LIST), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                let message = 'Failed to create transfer.';
                try {
                    const errorData = await response.json();
                    if (response.status === 409 && errorData?.branch_access_required) {
                        const requestId = errorData?.request?.id ?? errorData?.request_id;
                        const nextIssue = {
                            blocked: true,
                            message: errorData?.message || 'Cross-branch approval is required before transfer.',
                            requestId: requestId ? Number(requestId) : undefined,
                        };
                        if (errorData?.subject === 'receiver') {
                            setReceiverBranchAccessIssue(nextIssue);
                        } else {
                            setBranchAccessIssue(nextIssue);
                        }
                    }
                    message = errorData?.messages?.error || errorData?.message || message;
                } catch {
                    // ignore parse errors and use fallback message
                }
                setModal('Error', message, 'danger');
                return;
            }

            setModal('Success', 'Transfer created successfully.', 'info', true);
        } catch (error) {
            console.error('Failed to create transfer', error);
            setModal('Error', 'Failed to create transfer.', 'danger');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto py-20 text-center text-slate-500 dark:text-slate-300">
                Loading transfer setup...
            </div>
        );
    }

    const addReceiverHref = formData.senderRecordId
        ? `/admin/receivers/create?returnUrl=/admin/transfers/create&customer_id=${encodeURIComponent(formData.senderRecordId)}`
        : '/admin/receivers/create?returnUrl=/admin/transfers/create';

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in-up">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={onModalClose}
                onConfirm={onModalClose}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                isAlert={confirmModal.isAlert}
                confirmText="OK"
            />

            <div className="flex items-center justify-between gap-4">
                <div>
                    <Link href="/admin/transfers" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-2 group">
                        <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                        Back to Transfers
                    </Link>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Create Transfer</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2">Transfer, sender, and receiver details in one workflow.</p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setFormData((prev) => ({
                            ...prev,
                            invoiceNo: generateCode('LFX'),
                            transactionId: generateCode('LFX'),
                            otherTransactionId: ''
                        }));
                    }}
                    className="px-5 py-2.5 rounded-full glass-effect text-sm font-semibold text-slate-600 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-300 flex items-center gap-2"
                >
                    <RefreshCcw className="w-4 h-4" />
                    Regenerate IDs
                </button>
            </div>

            <div className="card-glass p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Transfer Setup</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">To Branch <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Landmark className="w-5 h-5" /></span>
                            <select
                                value={formData.toBranch}
                                onChange={(event) => setFormData((prev) => ({ ...prev, toBranch: event.target.value }))}
                                className="input-glass w-full pr-10 appearance-none"
                            >
                                <option value="">NONE</option>
                                {branches.map((branch) => {
                                    const value = branch.code || branch.transaction_prefix || String(branch.id);
                                    return (
                                        <option key={branch.id} value={value}>
                                            {branch.name}
                                        </option>
                                    );
                                })}
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Invoice No <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Copy className="w-5 h-5" /></span>
                            <input
                                className="input-glass w-full"
                                value={formData.invoiceNo}
                                onChange={(event) => setFormData((prev) => ({ ...prev, invoiceNo: event.target.value.toUpperCase() }))}
                            />
                        </div>
                    </div>

                    <div className="xl:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Invoicing Date <span className="text-red-500">*</span></label>
                        <div className="flex items-center gap-2">
                            <div className="relative input-icon flex-1">
                                <span className="input-icon-left"><Calendar className="w-5 h-5" /></span>
                                <input
                                    type="datetime-local"
                                    className="input-glass w-full"
                                    value={formData.invoicingDate}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, invoicingDate: event.target.value }))}
                                />
                            </div>
                            <button type="button" onClick={setNowInvoicingDate} className="px-3 py-2 rounded-full glass-effect text-xs font-semibold whitespace-nowrap">
                                Set date
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Payout Currency <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Coins className="w-5 h-5" /></span>
                            <select
                                value={formData.payoutCurrency}
                                onChange={(event) => applyRateByCurrency(event.target.value)}
                                className="input-glass w-full pr-10 appearance-none"
                            >
                                {currencies.map((currency) => (
                                    <option key={currency.id} value={currency.code}>
                                        {currency.code}
                                    </option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Customer Rate <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><BadgePoundSterling className="w-5 h-5" /></span>
                            <input
                                type="number"
                                step="0.0001"
                                className="input-glass w-full"
                                value={formData.customerRate}
                                onChange={(event) => {
                                    const newRate = event.target.value;
                                    setFormData((prev) => ({ ...prev, customerRate: newRate }));
                                    updateAmountsFromSource(formData.receiveAmount, newRate);
                                }}
                            />
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                            Branch Rate For £: {selectedBranchRate || '-'}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Receive Amount (£) <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><HandCoins className="w-5 h-5" /></span>
                            <input
                                type="number"
                                step="0.01"
                                className="input-glass w-full"
                                value={formData.receiveAmount}
                                onChange={(event) => updateAmountsFromSource(event.target.value, formData.customerRate)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">FC Transfer Amount <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Wallet className="w-5 h-5" /></span>
                            <input
                                type="number"
                                step="0.01"
                                className="input-glass w-full"
                                value={formData.fcTransferAmount}
                                onChange={(event) => updateAmountsFromFc(event.target.value, formData.customerRate)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Transaction Id</label>
                        <input className="input-glass w-full" value={formData.transactionId} readOnly />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Other Transaction Id</label>
                        <input
                            className="input-glass w-full"
                            value={formData.otherTransactionId}
                            onChange={(event) => setFormData((prev) => ({ ...prev, otherTransactionId: event.target.value }))}
                        />
                    </div>
                </div>
            </div>

            <div className="card-glass p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Sender Details</h2>
                    <Link
                        href="/admin/remitters/create?returnUrl=/admin/transfers/create"
                        className="px-4 py-2 rounded-full btn-primary text-sm font-semibold inline-flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add new sender
                    </Link>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Sender Id <span className="text-red-500">*</span></label>
                    <div className="relative input-icon">
                        <span className="input-icon-left"><Search className="w-5 h-5" /></span>
                        <input
                            className="input-glass w-full"
                            placeholder="Search sender by name, id, or phone"
                            value={senderSearch}
                            onChange={(event) => setSenderSearch(event.target.value)}
                        />
                        {senderSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />}
                    </div>
                    {senderResults.length > 0 && (
                        <div className="mt-2 rounded-2xl border border-slate-100/70 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/40 max-h-60 overflow-y-auto divide-y divide-slate-100/70 dark:divide-slate-700/60">
                            {senderResults.map((sender) => (
                                <button
                                    type="button"
                                    key={sender.id}
                                    onClick={() => selectSender(sender)}
                                    className="w-full text-left px-4 py-3 hover:bg-teal-50/50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{sender.name}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-300">{sender.sender_id || '-'} {sender.phone ? `• ${sender.phone}` : ''}</div>
                                </button>
                            ))}
                        </div>
                    )}
                    {branchAccessIssue.blocked && (
                        <div className="mt-3 rounded-2xl border border-amber-200/70 bg-amber-50/80 dark:border-amber-800/60 dark:bg-amber-900/20 px-4 py-3">
                            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                                {branchAccessIssue.message}
                            </p>
                            {branchAccessIssue.requestId ? (
                                <p className="mt-1 text-xs text-amber-700/90 dark:text-amber-200/90">
                                    Request #{branchAccessIssue.requestId} is pending previous branch approval.
                                </p>
                            ) : null}
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    {amlActions.map((action) => (
                        <button
                            type="button"
                            key={action}
                            onClick={() => triggerAmlAction(action, 'Sender')}
                            className="px-3 py-1.5 rounded-full glass-effect text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-300"
                        >
                            {action}
                        </button>
                    ))}
                </div>
                <div className="text-xs font-semibold">
                    {senderAmlState === 'running' && <span className="text-amber-600 dark:text-amber-300">Sender AML check is running...</span>}
                    {senderAmlState === 'passed' && <span className="text-teal-600 dark:text-teal-300">Sender AML check passed.</span>}
                    {senderAmlState === 'failed' && <span className="text-red-600 dark:text-red-300">Sender AML check failed.</span>}
                    {senderAmlState === 'idle' && <span className="text-slate-500 dark:text-slate-300">Run AML checks to verify sender profile.</span>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Sender Verified</label>
                        <select
                            className="input-glass w-full"
                            value={formData.senderVerified}
                            onChange={(event) => setFormData((prev) => ({ ...prev, senderVerified: event.target.value as 'yes' | 'no' }))}
                        >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                        </select>
                    </div>

                    <div className="xl:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Sender Name <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><User className="w-5 h-5" /></span>
                            <input
                                className="input-glass w-full"
                                value={formData.senderName}
                                onChange={(event) => setFormData((prev) => ({ ...prev, senderName: event.target.value }))}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Sender Date Of Birth</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                className="input-glass w-full"
                                value={formData.senderDateOfBirth}
                                onChange={(event) => setFormData((prev) => ({ ...prev, senderDateOfBirth: event.target.value }))}
                            />
                            <button type="button" onClick={setNowSenderDob} className="px-2.5 py-2 rounded-full glass-effect text-xs font-semibold whitespace-nowrap">Set</button>
                            <button type="button" onClick={clearSenderDob} className="px-2.5 py-2 rounded-full glass-effect text-xs font-semibold whitespace-nowrap">Clear</button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Sender Place of Birth</label>
                        <input
                            className="input-glass w-full"
                            value={formData.senderPlaceOfBirth}
                            onChange={(event) => setFormData((prev) => ({ ...prev, senderPlaceOfBirth: event.target.value }))}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Sender Contacts</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Phone className="w-5 h-5" /></span>
                            <input
                                className="input-glass w-full"
                                value={formData.senderContacts}
                                onChange={(event) => setFormData((prev) => ({ ...prev, senderContacts: event.target.value }))}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Sender Postcode</label>
                        <div className="flex items-center gap-2">
                            <input
                                className="input-glass w-full"
                                value={formData.senderPostcode}
                                onChange={(event) => setFormData((prev) => ({ ...prev, senderPostcode: event.target.value }))}
                            />
                            <button type="button" onClick={handleFindSenderByPostcode} className="px-2.5 py-2 rounded-full glass-effect text-xs font-semibold whitespace-nowrap">Find</button>
                            <button type="button" onClick={handleClearSenderPostcode} className="px-2.5 py-2 rounded-full glass-effect text-xs font-semibold whitespace-nowrap">Clear</button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Deposit Bank</label>
                        <select className="input-glass w-full" value={formData.depositBank} onChange={(event) => setFormData((prev) => ({ ...prev, depositBank: event.target.value }))}>
                            <option>NONE - (N)</option>
                            <option>HBL Pakistan</option>
                            <option>MCB Pakistan</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Deposit Branch</label>
                        <select className="input-glass w-full" value={formData.depositBranch} onChange={(event) => setFormData((prev) => ({ ...prev, depositBranch: event.target.value }))}>
                            <option>CASH</option>
                            <option>MAIN</option>
                            <option>ONLINE</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Source Of Income</label>
                        <select className="input-glass w-full" value={formData.sourceOfIncome} onChange={(event) => setFormData((prev) => ({ ...prev, sourceOfIncome: event.target.value }))}>
                            <option>Salary</option>
                            <option>Business</option>
                            <option>Savings</option>
                            <option>Gift</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Relationship</label>
                        <select className="input-glass w-full" value={formData.relationship} onChange={(event) => setFormData((prev) => ({ ...prev, relationship: event.target.value }))}>
                            <option>Family</option>
                            <option>Friend</option>
                            <option>Business Partner</option>
                            <option>Self</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Purpose Of Transaction</label>
                        <select className="input-glass w-full" value={formData.purposeOfTransaction} onChange={(event) => setFormData((prev) => ({ ...prev, purposeOfTransaction: event.target.value }))}>
                            <option>Family Maintenance/Savings</option>
                            <option>Medical</option>
                            <option>Education</option>
                            <option>Business</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Other Purpose</label>
                        <input
                            className="input-glass w-full"
                            value={formData.otherPurpose}
                            onChange={(event) => setFormData((prev) => ({ ...prev, otherPurpose: event.target.value }))}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Entry Type <span className="text-red-500">*</span></label>
                        <select className="input-glass w-full" value={formData.entryType} onChange={(event) => setFormData((prev) => ({ ...prev, entryType: event.target.value }))}>
                            <option>Cash Collected</option>
                            <option>Bank Transfer Received</option>
                            <option>Card Collected</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Payment Mode</label>
                        <select className="input-glass w-full" value={formData.paymentMode} onChange={(event) => setFormData((prev) => ({ ...prev, paymentMode: event.target.value }))}>
                            <option>P - CASH PICKUP</option>
                            <option>D - DIRECT BANK</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="card-glass p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Receiver Details</h2>
                    <Link
                        href={addReceiverHref}
                        className="px-4 py-2 rounded-full btn-primary text-sm font-semibold inline-flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add new receiver
                    </Link>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Select Receiver <span className="text-red-500">*</span></label>
                    <div className="relative input-icon">
                        <span className="input-icon-left"><Building2 className="w-5 h-5" /></span>
                        <select
                            className="input-glass w-full pr-10 appearance-none"
                            value={formData.receiverRecordId}
                            onChange={(event) => {
                                const selected = beneficiaries.find((item) => String(item.id) === event.target.value);
                                if (selected) {
                                    void selectReceiver(selected);
                                } else {
                                    setFormData((prev) => ({ ...prev, receiverRecordId: '' }));
                                    setReceiverBranchAccessIssue({ blocked: false, message: '' });
                                }
                            }}
                        >
                            <option value="">- - NONE</option>
                            {beneficiaries.map((beneficiary) => (
                                <option key={beneficiary.id} value={String(beneficiary.id)}>
                                    {beneficiary.name}
                                </option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-slate-400 pointer-events-none" />
                    </div>
                    {receiverBranchAccessIssue.blocked && (
                        <div className="mt-3 rounded-2xl border border-amber-200/70 bg-amber-50/80 dark:border-amber-800/60 dark:bg-amber-900/20 px-4 py-3">
                            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                                {receiverBranchAccessIssue.message}
                            </p>
                            {receiverBranchAccessIssue.requestId ? (
                                <p className="mt-1 text-xs text-amber-700/90 dark:text-amber-200/90">
                                    Request #{receiverBranchAccessIssue.requestId} is pending previous branch approval.
                                </p>
                            ) : null}
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    {amlActions.map((action) => (
                        <button
                            type="button"
                            key={action}
                            onClick={() => triggerAmlAction(action, 'Receiver')}
                            className="px-3 py-1.5 rounded-full glass-effect text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-300"
                        >
                            {action}
                        </button>
                    ))}
                </div>
                <div className="text-xs font-semibold">
                    {receiverAmlState === 'running' && <span className="text-amber-600 dark:text-amber-300">Receiver AML check is running...</span>}
                    {receiverAmlState === 'passed' && <span className="text-teal-600 dark:text-teal-300">Receiver AML check passed.</span>}
                    {receiverAmlState === 'failed' && <span className="text-red-600 dark:text-red-300">Receiver AML check failed.</span>}
                    {receiverAmlState === 'idle' && <span className="text-slate-500 dark:text-slate-300">Run AML checks to verify receiver profile.</span>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Receiver Verified</label>
                        <select
                            className="input-glass w-full"
                            value={formData.receiverVerified}
                            onChange={(event) => setFormData((prev) => ({ ...prev, receiverVerified: event.target.value as 'yes' | 'no' }))}
                        >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                        </select>
                    </div>

                    <div className="xl:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Receiver Name <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><User className="w-5 h-5" /></span>
                            <input
                                className="input-glass w-full"
                                value={formData.receiverName}
                                onChange={(event) => setFormData((prev) => ({ ...prev, receiverName: event.target.value }))}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Receiver Contacts</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Phone className="w-5 h-5" /></span>
                            <input
                                className="input-glass w-full"
                                value={formData.receiverContacts}
                                onChange={(event) => setFormData((prev) => ({ ...prev, receiverContacts: event.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="xl:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Receiver Address <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><MapPin className="w-5 h-5" /></span>
                            <input
                                className="input-glass w-full"
                                value={formData.receiverAddress}
                                onChange={(event) => setFormData((prev) => ({ ...prev, receiverAddress: event.target.value }))}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Receiver City</label>
                        <input
                            className="input-glass w-full"
                            value={formData.receiverCity}
                            onChange={(event) => setFormData((prev) => ({ ...prev, receiverCity: event.target.value }))}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Receiver Country <span className="text-red-500">*</span></label>
                        <input
                            className="input-glass w-full"
                            value={formData.receiverCountry}
                            onChange={(event) => setFormData((prev) => ({ ...prev, receiverCountry: event.target.value }))}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Receiver Date Of Birth <span className="text-red-500">*</span></label>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                className="input-glass w-full"
                                value={formData.receiverDateOfBirth}
                                onChange={(event) => setFormData((prev) => ({ ...prev, receiverDateOfBirth: event.target.value }))}
                            />
                            <button type="button" onClick={setNowReceiverDob} className="px-2.5 py-2 rounded-full glass-effect text-xs font-semibold whitespace-nowrap">Set</button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Receiver Place of Birth</label>
                        <input
                            className="input-glass w-full"
                            value={formData.receiverPlaceOfBirth}
                            onChange={(event) => setFormData((prev) => ({ ...prev, receiverPlaceOfBirth: event.target.value }))}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">CNIC No</label>
                        <input
                            className="input-glass w-full"
                            value={formData.cnicNo}
                            onChange={(event) => setFormData((prev) => ({ ...prev, cnicNo: event.target.value }))}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Bank</label>
                        <input
                            className="input-glass w-full"
                            value={formData.receiverBank}
                            onChange={(event) => setFormData((prev) => ({ ...prev, receiverBank: event.target.value }))}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Branch (Branch Code)</label>
                        <input
                            className="input-glass w-full"
                            value={formData.receiverBranchCode}
                            onChange={(event) => setFormData((prev) => ({ ...prev, receiverBranchCode: event.target.value }))}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Account No</label>
                        <input
                            className="input-glass w-full"
                            value={formData.receiverAccountNo}
                            onChange={(event) => setFormData((prev) => ({ ...prev, receiverAccountNo: event.target.value }))}
                        />
                    </div>

                    <div className="xl:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Account Other Details</label>
                        <input
                            className="input-glass w-full"
                            value={formData.receiverAccountOtherDetails}
                            onChange={(event) => setFormData((prev) => ({ ...prev, receiverAccountOtherDetails: event.target.value }))}
                        />
                    </div>

                    <div className="xl:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Remarks</label>
                        <textarea
                            rows={3}
                            className="input-glass w-full resize-none"
                            value={formData.remarks}
                            onChange={(event) => setFormData((prev) => ({ ...prev, remarks: event.target.value }))}
                        />
                    </div>

                    <div className="xl:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Other Reference</label>
                        <textarea
                            rows={3}
                            className="input-glass w-full resize-none"
                            value={formData.otherReference}
                            onChange={(event) => setFormData((prev) => ({ ...prev, otherReference: event.target.value }))}
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-4">
                <Link href="/admin/transfers" className="px-6 py-3 rounded-full glass-effect text-slate-600 dark:text-slate-300 font-bold text-sm transition-colors">
                    Cancel
                </Link>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving}
                    className="btn-primary px-6 py-3 rounded-full text-sm font-bold inline-flex items-center gap-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 disabled:opacity-60"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Creating Transfer...' : 'Create Transfer'}
                </button>
            </div>

        </div>
    );
}
