import type { OrderStatus } from '@prisma/client';
import { PASSWORD_RESET_TTL_MINUTES, PAYMENT_METHOD_LABEL } from '@iitr/shared';
import { env } from '../config/env';

export interface OrderForEmail {
  id: string;
  total: string;
  subtotal: string;
  deliveryFee: string;
  bhawan: string;
  roomNo: string;
  items: { itemName: string; quantity: number; lineTotal: string }[];
}

type Template = { subject: string; html: string; text: string };

const STATUS_TEXT: Record<OrderStatus, string> = {
  PLACED: 'placed',
  CONFIRMED: 'confirmed and is being prepared',
  OUT_FOR_DELIVERY: 'out for delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

/** Escapes text for safe inclusion in HTML (names, notes and item names are user-controlled). */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const rupees = (value: string) => `₹${Number(value).toFixed(2)}`;
const shortId = (id: string) => `#${id.slice(-8).toUpperCase()}`;
const firstName = (name: string) => name.split(' ')[0];
const orderUrl = (id: string) => `${env.CLIENT_URL}/orders/${id}`;

function layout(heading: string, bodyHtml: string, cta?: { label: string; url: string }): string {
  const button = cta
    ? `<p style="margin:28px 0"><a href="${escapeHtml(cta.url)}" style="background:#1b3670;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(cta.label)}</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Segoe UI,Arial,sans-serif;color:#1e293b">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e2e8f0;border-radius:12px">
<tr><td style="background:#14295c;padding:18px 24px;border-radius:12px 12px 0 0;color:#fff;font-size:18px;font-weight:700">IITR <span style="color:#f5b82e">Delivery</span></td></tr>
<tr><td style="padding:24px"><h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(heading)}</h1>${bodyHtml}${button}
<p style="color:#64748b;font-size:12px;margin-top:32px">IIT Roorkee campus delivery · This is an automated email.</p></td></tr>
</table></td></tr></table></body></html>`;
}

function itemsTable(order: OrderForEmail): string {
  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${escapeHtml(i.itemName)} × ${i.quantity}</td><td align="right">${rupees(i.lineTotal)}</td></tr>`,
    )
    .join('');
  const fee = Number(order.deliveryFee) === 0 ? 'FREE' : rupees(order.deliveryFee);
  return `<table width="100%" style="font-size:14px;border-top:1px solid #e2e8f0;margin-top:8px">${rows}
<tr><td style="padding:6px 0;color:#64748b;border-top:1px solid #e2e8f0">Delivery fee</td><td align="right" style="border-top:1px solid #e2e8f0">${fee}</td></tr>
<tr><td style="padding:6px 0;font-weight:700">Total</td><td align="right" style="font-weight:700">${rupees(order.total)}</td></tr></table>
<p style="font-size:14px;color:#475569">Deliver to: Room ${escapeHtml(order.roomNo)}, ${escapeHtml(order.bhawan)} Bhawan<br>Payment: ${PAYMENT_METHOD_LABEL}</p>`;
}

function itemsText(order: OrderForEmail): string {
  const lines = order.items.map((i) => `- ${i.itemName} x ${i.quantity}: ${rupees(i.lineTotal)}`).join('\n');
  return `${lines}\nTotal: ${rupees(order.total)} (${PAYMENT_METHOD_LABEL})\nDeliver to: Room ${order.roomNo}, ${order.bhawan} Bhawan`;
}

export function welcomeEmail(name: string): Template {
  const hi = `Welcome to IITR Delivery, ${firstName(name)}!`;
  return {
    subject: 'Welcome to IITR Delivery',
    html: layout(hi, `<p>Snacks, stationery and essentials from campus shops, delivered to your bhawan room. Delivery is free on orders above ₹300.</p>`, {
      label: 'Start shopping',
      url: env.CLIENT_URL,
    }),
    text: `${hi}\n\nSnacks, stationery and essentials from campus shops, delivered to your bhawan room.\n\nStart shopping: ${env.CLIENT_URL}`,
  };
}

export function orderPlacedEmail(name: string, order: OrderForEmail): Template {
  const heading = `Thanks, ${firstName(name)}! Your order ${shortId(order.id)} is placed`;
  return {
    subject: `Order ${shortId(order.id)} placed`,
    html: layout(heading, `<p>We'll let you know when it's confirmed.</p>${itemsTable(order)}`, { label: 'View order', url: orderUrl(order.id) }),
    text: `${heading}\n\n${itemsText(order)}\n\nView order: ${orderUrl(order.id)}`,
  };
}

export function orderStatusEmail(name: string, order: OrderForEmail, status: OrderStatus): Template {
  const heading = `Your order ${shortId(order.id)} is ${STATUS_TEXT[status]}`;
  const extra =
    status === 'OUT_FOR_DELIVERY'
      ? `<p>Please keep ${rupees(order.total)} ready (${PAYMENT_METHOD_LABEL}).</p>`
      : status === 'DELIVERED'
        ? `<p>Enjoy, ${escapeHtml(firstName(name))}! Thanks for ordering with IITR Delivery.</p>`
        : '';
  return {
    subject: `Order ${shortId(order.id)}: ${STATUS_TEXT[status].split(' and ')[0]}`,
    html: layout(heading, extra || '<p>We\'ll keep you posted.</p>', { label: 'Track your order', url: orderUrl(order.id) }),
    text: `${heading}\n\nTrack your order: ${orderUrl(order.id)}`,
  };
}

export function orderCancelledEmail(name: string, order: OrderForEmail, byAdmin: boolean): Template {
  const heading = `Order ${shortId(order.id)} has been cancelled`;
  const why = byAdmin
    ? `<p>Sorry, ${escapeHtml(firstName(name))}: the store had to cancel this order. You haven't been charged.</p>`
    : `<p>As requested, we've cancelled this order. You haven't been charged.</p>`;
  return {
    subject: `Order ${shortId(order.id)} cancelled`,
    html: layout(heading, `${why}${itemsTable(order)}`, { label: 'Order again', url: orderUrl(order.id) }),
    text: `${heading}\n\n${byAdmin ? 'The store had to cancel this order.' : 'As requested, we cancelled this order.'} You haven't been charged.\n\n${itemsText(order)}`,
  };
}

export function passwordResetEmail(name: string, resetUrl: string): Template {
  const heading = `Reset your password, ${firstName(name)}`;
  const body = `<p>We received a request to reset your IITR Delivery password. This link works once and expires in ${PASSWORD_RESET_TTL_MINUTES} minutes.</p>
<p style="color:#64748b;font-size:13px">If you didn't ask for this, you can ignore this email. Your password won't change.</p>`;
  return {
    subject: 'Reset your IITR Delivery password',
    html: layout(heading, body, { label: 'Choose a new password', url: resetUrl }),
    text: `${heading}\n\nOpen this link to choose a new password (valid for ${PASSWORD_RESET_TTL_MINUTES} minutes, single use):\n${resetUrl}\n\nIf you didn't ask for this, ignore this email.`,
  };
}
