
import { useEffect, useCallback } from 'react';
import useDBStorage from './useLocalStorage';
import { Strategy } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

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
                    id: crypto.randomUUID(),
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
        
        const strategyToPush: Strategy = {
            id: strategyData.id || crypto.randomUUID(), // Note: ID generation logic duplicated slightly for safety if not captured
            // Ideally we grab the exact object, but for now we construct a clean one
            name: strategyData.name,
            criteria: strategyData.criteria,
            createdAt: new Date().toISOString() // This might overwrite creation date on edit, handled below
        };

        if (strategyData.id) {
             // If editing, try to preserve original createdAt if we can find it in current state
             // But since we are inside an async function, we can't easily access the 'prev' state synchronously outside the setter.
             // We'll rely on the fact that the local setter ran.
             // A safer way for the cloud push is to fetch, merge, push.
        }

        if (user) {
             try {
                const docRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(docRef);
                let currentCloudStrategies: Strategy[] = [];
                if (docSnap.exists() && docSnap.data().strategies) {
                    currentCloudStrategies = docSnap.data().strategies;
                }
                
                // Find existing to preserve ID and CreatedAt if updating
                const index = currentCloudStrategies.findIndex(s => s.id === (strategyData.id || ''));
                
                const finalStrategy: Strategy = {
                    id: strategyData.id || newStrategy!.id,
                    name: strategyData.name,
                    criteria: strategyData.criteria,
                    createdAt: index !== -1 ? currentCloudStrategies[index].createdAt : newStrategy!.createdAt
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
