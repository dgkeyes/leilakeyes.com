import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

// Each form posts to /api/forms with a hidden form-name field. This maps it to an email subject and a thank-you page.
const FORMS = {
    "baking-order": { subject: "New baking order", redirect: "/baking/thank-you" },
    "charcuterie-order": { subject: "New charcuterie order", redirect: "/charcuterie/charcuterie-thank-you" },
};

const SENDER = { name: "leilakeyes.com", addr: "forms@leilakeyes.com" };
const SKIPPED_FIELDS = new Set(["form-name", "bot-field"]);

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.hostname.startsWith("www.")) {
            url.hostname = url.hostname.slice(4);
            return Response.redirect(url.toString(), 301);
        }

        if (url.pathname === "/api/forms" && request.method === "POST") {
            return handleForm(request, env);
        }

        return env.ASSETS.fetch(request);
    },
};

async function handleForm(request, env) {
    const data = await request.formData();
    const form = FORMS[data.get("form-name")];

    if (!form) {
        return new Response("Unknown form.", { status: 400 });
    }

    const thankYou = Response.redirect(new URL(form.redirect, request.url).toString(), 303);

    // The honeypot field is hidden from people, so anything in it came from a bot. Pretend it worked.
    if (data.get("bot-field")) {
        return thankYou;
    }

    const lines = [];
    for (const [key, value] of data) {
        if (SKIPPED_FIELDS.has(key) || typeof value !== "string") continue;
        lines.push(`${labelFor(key)}: ${value.trim() || "(blank)"}`);
    }

    const msg = createMimeMessage();
    msg.setSender(SENDER);
    msg.setRecipient(env.FORMS_TO);
    msg.setSubject(`${form.subject} from ${data.get("name") || "someone"}`);
    if (data.get("email")) {
        msg.setHeader("Reply-To", data.get("email"));
    }
    msg.addMessage({ contentType: "text/plain", data: lines.join("\n\n") });

    try {
        await env.FORMS_EMAIL.send(new EmailMessage(SENDER.addr, env.FORMS_TO, msg.asRaw()));
    } catch (error) {
        console.error("Form email failed", error);
        return new Response("Sorry, your order didn't go through. Please try again in a few minutes.", { status: 500 });
    }

    return thankYou;
}

function labelFor(key) {
    const words = key.replace(/_/g, " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
}
