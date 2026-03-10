export interface SendSMSParams {
  recipients: string[];
  message: string;
  sender?: string;
  schedule_date?: string; // Format: YYYY-MM-DD HH:mm:ss
}

const ARKESEL_API_KEY = import.meta.env.VITE_ARKESEL_API_KEY;

export const sendSMS = async ({ recipients, message, sender = 'BorlaWura', schedule_date }: SendSMSParams) => {
  if (!ARKESEL_API_KEY) {
    console.warn('Arkesel API Key missing. SMS will not be sent.');
    return { success: false, message: 'API Key missing' };
  }

  try {
    const payload: any = {
      sender,
      message,
      recipients,
    };

    if (schedule_date) {
      payload.scheduled_date = schedule_date;
    }

    // Using the proxy defined in vite.config.ts to avoid CORS
    // Target: https://sms.arkesel.com/api/v2/sms/send
    const response = await fetch('/api/arkesel/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': ARKESEL_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('Arkesel Response:', data);

    // Arkesel usually returns { status: 'success', ... }
    if (data.status === 'success' || response.ok) {
      return { success: true, data };
    }

    return { success: false, message: data.message || 'Unknown error' };
  } catch (error: any) {
    console.error('Error sending SMS via Arkesel:', error);
    return {
      success: false,
      message: error.message || 'Failed to connect to SMS gateway'
    };
  }
};
