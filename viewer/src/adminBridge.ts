import {useEffect, useState} from "react";

export const ADMIN_EXTENSION_BRIDGE_VERSION = 1 as const;

export interface AdminExtensionContext {
    server: {
        name: string;
    } | null;
}

interface AdminContextChangedMessage {
    source: "openrsc-admin";
    type: "context.changed";
    version: typeof ADMIN_EXTENSION_BRIDGE_VERSION;
    context: AdminExtensionContext;
}

function parentOrigin(): string | null {
    if (window.parent === window || !document.referrer) return null;
    try {
        return new URL(document.referrer).origin;
    } catch {
        return null;
    }
}

export function useAdminExtensionBridge(): AdminExtensionContext | null {
    const [context, setContext] = useState<AdminExtensionContext | null>(null);

    useEffect(() => {
        const origin = parentOrigin();
        if (!origin) return;

        const onMessage = (event: MessageEvent<AdminContextChangedMessage>) => {
            if (event.source !== window.parent || event.origin !== origin) return;
            const message = event.data;
            if (
                message?.source !== "openrsc-admin" ||
                message.type !== "context.changed" ||
                message.version !== ADMIN_EXTENSION_BRIDGE_VERSION
            ) return;

            setContext(message.context);
            window.parent.postMessage({
                source: "openrsc-world-viewer",
                type: "context.applied",
                version: ADMIN_EXTENSION_BRIDGE_VERSION,
                serverName: message.context.server?.name ?? null,
            }, origin);
        };

        window.addEventListener("message", onMessage);
        window.parent.postMessage({
            source: "openrsc-world-viewer",
            type: "viewer.ready",
            version: ADMIN_EXTENSION_BRIDGE_VERSION,
        }, origin);

        return () => window.removeEventListener("message", onMessage);
    }, []);

    return context;
}
