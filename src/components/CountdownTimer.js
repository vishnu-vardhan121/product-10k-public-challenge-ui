import React, { useState, useEffect } from 'react';

export default function CountdownTimer({ targetDate }) {
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
        if (!targetDate) return;

        const calculateTimeLeft = () => {
            const difference = new Date(targetDate) - new Date();

            if (difference <= 0) {
                return null;
            }

            return {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        };

        // Initial calculation
        setTimeLeft(calculateTimeLeft());

        // Update every second
        const timer = setInterval(() => {
            const remaining = calculateTimeLeft();
            if (!remaining) {
                clearInterval(timer);
            }
            setTimeLeft(remaining);
        }, 1000);

        return () => clearInterval(timer);
    }, [targetDate]);

    if (!timeLeft) return null;

    return (
        <div className="flex items-center gap-1 font-mono font-bold text-sm">
            {timeLeft.days > 0 && <span>{timeLeft.days}d</span>}
            <span>{timeLeft.hours}h</span>
            <span>{timeLeft.minutes}m</span>
            <span className="text-opacity-60">{timeLeft.seconds}s</span>
        </div>
    );
}
