import {useEffect, useState} from "react";

export const ADMIN_EXTENSION_BRIDGE_VERSION = 1 as const;

export interface AdminExtensionContext {
    server: {
        name: string;
    } | null;
}

export interface AdminWorldPlayerSnapshot {
    databaseId: number;
    serverIndex: number;
    username: string;
    x: number;
    y: number;
    combatLevel: number;
    inCombat: boolean;
    sleeping: boolean;
    skulled: boolean;
    hits: number;
    maxHits: number;
    appearance: {
        sprites: number[];
        hair: number;
        top: number;
        bottom: number;
        skin: number;
    };
}

export interface AdminWorldNpcSnapshot {
    serverIndex: number;
    id: number;
    name: string;
    x: number;
    y: number;
    inCombat: boolean;
    hits: number;
    maxHits: number;
}

export interface AdminWorldGroundItemSnapshot {
    id: number;
    name: string;
    amount: number;
    x: number;
    y: number;
}

export interface AdminWorldSnapshot {
    version: number;
    serverName: string;
    generatedAtEpochMillis: number;
    serverTick: number;
    players: AdminWorldPlayerSnapshot[];
    npcs: AdminWorldNpcSnapshot[];
    groundItems: AdminWorldGroundItemSnapshot[];
}

interface AdminContextChangedMessage {
    source: "openrsc-admin";
    type: "context.changed";
    version: typeof ADMIN_EXTENSION_BRIDGE_VERSION;
    context: AdminExtensionContext;
}

interface AdminWorldSnapshotMessage {
    source: "openrsc-admin";
    type: "world.snapshot";
    version: typeof ADMIN_EXTENSION_BRIDGE_VERSION;
    snapshot: AdminWorldSnapshot;
}

type AdminBridgeMessage = AdminContextChangedMessage | AdminWorldSnapshotMessage;

export interface AdminExtensionBridgeState {
    context: AdminExtensionContext | null;
    worldSnapshot: AdminWorldSnapshot | null;
}

function parentOrigin(): string | null {
    if (window.parent === window || !document.referrer) return null;
    try {
        return new URL(document.referrer).origin;
    } catch {
        return null;
    }
}

export function useAdminExtensionBridge(): AdminExtensionBridgeState {
    const [context, setContext] = useState<AdminExtensionContext | null>(null);
    const [worldSnapshot, setWorldSnapshot] = useState<AdminWorldSnapshot | null>(null);

    useEffect(() => {
        const origin = parentOrigin();
        if (!origin) return;

        const onMessage = (event: MessageEvent<AdminBridgeMessage>) => {
            if (event.source !== window.parent || event.origin !== origin) return;
            const message = event.data;
            if (
                message?.source !== "openrsc-admin" ||
                message.version !== ADMIN_EXTENSION_BRIDGE_VERSION
            ) return;

            if (message.type === "context.changed") {
                setContext(message.context);
                window.parent.postMessage({
                    source: "openrsc-world-viewer",
                    type: "context.applied",
                    version: ADMIN_EXTENSION_BRIDGE_VERSION,
                    serverName: message.context.server?.name ?? null,
                }, origin);
                return;
            }

            if (message.type === "world.snapshot") {
                setWorldSnapshot(message.snapshot);
            }
        };

        window.addEventListener("message", onMessage);
        window.parent.postMessage({
            source: "openrsc-world-viewer",
            type: "viewer.ready",
            version: ADMIN_EXTENSION_BRIDGE_VERSION,
        }, origin);

        return () => window.removeEventListener("message", onMessage);
    }, []);

    return {context, worldSnapshot};
}
