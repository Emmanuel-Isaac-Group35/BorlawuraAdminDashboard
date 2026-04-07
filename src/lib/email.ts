import emailjs from '@emailjs/browser';

// EmailJS Initialization
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'GfXnmYS3ICMmzwhCR';
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_default';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_default';

emailjs.init(PUBLIC_KEY);

interface EmailParams {
  to_name: string;
  to_email: string;
  subject: string;
  message: string;
  [key: string]: any;
}

/**
 * Sends a generic transactional email via EmailJS
 */
export const sendEmail = async (params: EmailParams) => {
  try {
    const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, params);
    return { success: true, result };
  } catch (error) {
    console.error('EmailJS Error:', error);
    return { success: false, error };
  }
};

/**
 * Sends a welcome email to a new staff member or user
 */
export const sendWelcomeEmail = async (name: string, email: string) => {
  return sendEmail({
    to_name: name,
    to_email: email,
    subject: 'Welcome to BorneoWura Fleet Management',
    message: `Hello ${name}, your administrative account has been activated. Please log in to complete your profile.`
  });
};

/**
 * Sends a notification for a new pickup request
 */
export const sendPickupNotification = async (adminName: string, adminEmail: string, pickupId: string) => {
  return sendEmail({
    to_name: adminName,
    to_email: adminEmail,
    subject: 'New Pickup Request Received',
    message: `A new waste management request (ID: ${pickupId}) has been logged and is awaiting dispatch.`
  });
};
