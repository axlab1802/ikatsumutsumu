"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// The GameCanvas relies on browser APIs (canvas, localStorage, AudioContext, Matter.js)
// meaning it MUST only be rendered on the client.
const ClientSideGameCanvas = dynamic(
    () => import("@/components/GameCanvas"),
    {
        ssr: false,
        loading: () => (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white flex-col gap-4">
                <Loader2 className="animate-spin" size={48} />
                <h2 className="text-xl font-bold text-gray-400">Loading physics engine...</h2>
            </div>
        )
    }
);

export default function GamePage() {
    return <ClientSideGameCanvas />;
}
