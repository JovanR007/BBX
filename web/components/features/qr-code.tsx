"use client";

import React from "react";
import QRCode from "react-qr-code";

interface QRCodeProps {
    url: string;
    size?: number;
    className?: string;
}

export function QRCodeDisplay({ url, size = 128, className }: QRCodeProps) {
    return (
        <div className={`bg-white p-2 rounded-lg ${className}`}>
            <QRCode value={url} size={size} />
        </div>
    );
}
