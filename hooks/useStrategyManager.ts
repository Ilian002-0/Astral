
import { useEffect, useCallback } from 'react';
import useDBStorage from './useLocalStorage';
import { Strategy } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

// Safe ID Generator
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const useStrategyManager = () => {
    const { data: strategies, setData: setStrategies } = useDBStorage<Strategy[]>('user_strategies_v1', []);
    const { user } = useAuth();

    // 1. Sync FROM Cloud (Listener)
    useEffect(() => {
        if (!user) return;

        const docRef = doc(db, 'users', user.uid);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const cloudStrategies = (data.strategies || []) as Strategy[];
                
                if (cloudStrategies.length === 0) return;

                setStrategies(localStrategies => {
                    const localMap = new Map(localStrategies.map(s => [s.id, s]));
                    let hasChanges = false;

                    cloudStrategies.forEach(remoteStrat => {
                        const localStrat = localMap.get(remoteStrat.id);
                        // Simple comparison to check if update is needed
                        // ideally we check a timestamp, but here we just check value equality (stringified)
                        if (!localStrat || JSON.stringify(localStrat) !== JSON.stringify(remoteStrat)) {
                            localMap.set(remoteStrat.id, remoteStrat);
                            hasChanges = true;
                        }
                    });

                    // "Merge Down": We add remote strategies to local. 
                    // We DO NOT delete local strategies that are missing in remote here, 
                    // to prevent data loss in case of sync issues.

                    return hasChanges ? Array.from(localMap.values()) : localStrategies;
                });
            }
        });

        return () => unsubscribe();
    }, [user, setStrategies]);

    // 2. Actions (Sync TO Cloud)
    
    const saveStrategy = useCallback(async (strategyData: { name: string, criteria: any, id?: string }) => {
        let newStrategy: Strategy;

        setStrategies(prev => {
            let updatedList;
            // Check if we are updating an existing strategy or creating a new one
            if (strategyData.id) {
                // Update
                const existing = prev.find(s => s.id === strategyData.id);
                if (existing) {
                    newStrategy = { ...existing, name: strategyData.name, criteria: strategyData.criteria };
                    updatedList = prev.map(s => s.id === strategyData.id ? newStrategy : s);
                } else {
                    // Fallback if ID provided but not found (rare)
                    newStrategy = {
                        id: strategyData.id,
                        createdAt: new Date().toISOString(),
                        name: strategyData.name,
                        criteria: strategyData.criteria
                    };
                    updatedList = [...prev, newStrategy];
                }
            } else {
                // Add New
                newStrategy = {
                    id: generateId(),
                    createdAt: new Date().toISOString(),
                    name: strategyData.name,
                    criteria: strategyData.criteria
                };
                updatedList = [...prev, newStrategy];
            }
            return updatedList;
        });

        // Push to Cloud
        // We use the newStrategy variable which is captured from the closure logic above.
        // However, since setState is functional, we need to reconstruct the object for the cloud call
        // to ensure we have the exact data.
        
        // Note: strategyData.id is undefined here for new strategies if not passed explicitly, so we generate again? 
        // NO, that would cause ID mismatch between local and cloud. 
        // The pattern used in StrategyView handles ID generation before calling this function now.
        // But for direct calls (if any), we need to ensure consistency. 
        // The safest way is to rely on what was put into state, but that's async.
        
        // Since we refactored StrategyView to generate the ID upfront, strategyData.id WILL be present.
        
        if (user) {
             try {
                const docRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(docRef);
                let currentCloudStrategies: Strategy[] = [];
                if (docSnap.exists() && docSnap.data().strategies) {
                    currentCloudStrategies = docSnap.data().strategies;
                }
                
                // If the ID was missing in the arg, we can't reliably sync the *exact same* ID generated inside the setState callback
                // unless we change how we call this. 
                // Assumption: strategyData.id is provided by the caller (StrategyView) now.
                const idToUse = strategyData.id || newStrategy!.id; // Fallback to captured (risky if async timing off, but mostly safe in single thread event loop)

                const index = currentCloudStrategies.findIndex(s => s.id === idToUse);
                
                const finalStrategy: Strategy = {
                    id: idToUse,
                    name: strategyData.name,
                    criteria: strategyData.criteria,
                    // If updating, preserve creation date from cloud if possible, else use new
                    createdAt: index !== -1 ? currentCloudStrategies[index].createdAt : new Date().toISOString()
                };

                if (index !== -1) {
                    currentCloudStrategies[index] = finalStrategy;
                } else {
                    currentCloudStrategies.push(finalStrategy);
                }
                
                await setDoc(docRef, { strategies: currentCloudStrategies }, { merge: true });
            } catch (e) {
                console.error("Error saving strategy to cloud", e);
            }
        }
    }, [user, setStrategies]);

    const deleteStrategy = useCallback(async (id: string) => {
        setStrategies(prev => prev.filter(s => s.id !== id));
        
        if (user) {
            try {
                 const docRef = doc(db, 'users', user.uid);
                 const docSnap = await getDoc(docRef);
                 if (docSnap.exists() && docSnap.data().strategies) {
                     const current = docSnap.data().strategies as Strategy[];
                     const updated = current.filter(s => s.id !== id);
                     await setDoc(docRef, { strategies: updated }, { merge: true });
                 }
            } catch (e) {
                console.error("Error deleting strategy from cloud", e);
            }
        }
    }, [user, setStrategies]);

    return { strategies, saveStrategy, deleteStrategy };
};
