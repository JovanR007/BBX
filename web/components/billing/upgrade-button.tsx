"use client";

import { useState } from "react";
import { PaymentSelectorModal } from "./payment-selector-modal";

export function UpgradeButton({ price }: { price: string }) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-lg transition-colors shadow-lg hover:shadow-yellow-500/20"
            >
                Upgrade to Pro
            </button>
            <PaymentSelectorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                planPrice={price}
            />
        </>
    );
}
