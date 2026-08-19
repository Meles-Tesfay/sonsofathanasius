import { Request, Response } from 'express';
import { sendSuccess } from '../utils/response.js';
import { ContactFormSchema } from '../validators/contactValidator.js';

export const submitContactForm = async (req: Request, res: Response) => {
  // Validate request body using Zod schema
  // Express 5 async error handling will automatically catch ZodError and pass it to errorHandler
  const data = ContactFormSchema.parse(req.body);

  // Log the received message to console.
  // DB persistence (e.g. contact_messages table) will be implemented by teammates later.
  console.log('[Contact Form] New message received:', {
    name: data.name,
    email: data.email,
    subject: data.subject || 'N/A',
    messagePreview: data.message.substring(0, 50) + (data.message.length > 50 ? '...' : '')
  });

  return sendSuccess(res, { message: 'Message received successfully.' });
};
