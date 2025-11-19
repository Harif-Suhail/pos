import { useAppContext } from './useAppContext';
import { formatCurrency as formatCurrencyHelper } from '../utils/helpers';

export const useCurrency = () => {
    const { currentTenant } = useAppContext();
    
    const formatCurrency = (amount: number): string => {
        const currency = currentTenant?.settings?.currency || 'USD';
        return formatCurrencyHelper(amount, currency);
    };

    const getCurrency = (): string => {
        return currentTenant?.settings?.currency || 'USD';
    };

    return {
        formatCurrency,
        currency: getCurrency(),
    };
};
