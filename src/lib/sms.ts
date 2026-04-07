export interface SendSMSParams {
  recipients: string[];
  message: string;
  sender?: string;
  schedule_date?: string; // Format: YYYY-MM-DD HH:mm:ss
}

export const ARKESEL_API_KEY = import.meta.env.VITE_ARKESEL_API_KEY;

export const sendSMS = async ({ recipients, message, sender = 'BorlaWura', schedule_date }: SendSMSParams) => {
  if (!ARKESEL_API_KEY) {
    console.warn('Arkesel API Key missing. SMS will not be sent.');
    return { success: false, message: 'API Key missing' };
  }

  try {
    // Legacy API expects single recipient per request or comma separated
    const phoneNumbers = recipients.join(',');
    
    let url = `/api/arkesel/sms/api?action=send-sms&api_key=${ARKESEL_API_KEY}&to=${phoneNumbers}&from=${sender}&sms=${encodeURIComponent(message)}`;
    
    if (schedule_date) {
      url += `&schedule=${encodeURIComponent(schedule_date)}`;
    }

    const response = await fetch(url);
    const data = await response.json();
    
    // Legacy API status checks (might return string or numbers)
    if (data.status === 'ok' || data.code === 'ok' || data.status === 'success' || response.ok) {
      return { success: true, data };
    }

    return { success: false, message: data.message || 'Transmission failed at Arkesel Gateway' };
  } catch (error: any) {
    console.error('Arkesel Protocol Violation:', error);
    return {
      success: false,
      message: error.message || 'Failed to establish tunnel to SMS gateway'
    };
  }
};

export const getSMSBalance = async () => {
  if (!ARKESEL_API_KEY) {
    return { success: false, balance: 0, message: 'API Key missing' };
  }

  try {
    // Exact format from user documentation: &response=json (removed the space)
    const url = `/api/arkesel/sms/api?action=check-balance&api_key=${ARKESEL_API_KEY}&response=json`;
    const response = await fetch(url);

    if (!response.ok) {
       throw new Error(`Arkesel Interface Protocol Status: ${response.status}`);
    }

    const data = await response.json();
    
    // Robust balance extraction from multiple potential legacy formats
    const rawBalance = data.balance ?? data.data?.balance ?? data.sms_balance ?? data.units ?? 0;
    const balance = parseFloat(String(rawBalance).replace(/[^0-9.]/g, ''));
    
    return { success: true, balance: isNaN(balance) ? 0 : balance };
  } catch (error: any) {
    console.error('Arkesel Balance Protocol Interrupted:', error);
    return { success: false, balance: 0, message: error.message };
  }
};
