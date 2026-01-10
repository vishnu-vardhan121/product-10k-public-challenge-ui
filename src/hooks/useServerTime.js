import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';

/**
 * Hook to get the current time synchronized with the server.
 * Uses the timeOffset stored in Redux to adjust the local time.
 * @returns {Date} The current server time.
 */
export const useServerTime = () => {
    const timeOffset = useSelector((state) => state.publicChallenge.timeOffset) || 0;
    const [serverTime, setServerTime] = useState(new Date(Date.now() + timeOffset));

    useEffect(() => {
        // Update server time every second (or more frequently if needed for high precision)
        const interval = setInterval(() => {
            setServerTime(new Date(Date.now() + timeOffset));
        }, 1000);

        return () => clearInterval(interval);
    }, [timeOffset]);

    return serverTime;
};
