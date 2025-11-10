import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  limit,
  where,
  Timestamp,
  onSnapshot,
  QuerySnapshot,
  doc,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface FirestoreDocument {
  id: string;
  data: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class FirestoreService {
  /**
   * Get all documents from a collection
   */
  static async getCollection(collectionName: string, limitCount: number = 50) {
    try {
      console.log(`[Firestore] ========== Fetching collection: ${collectionName} ==========`);
      
      // Fetch documents without ordering first (since documents may not have createdAt field)
      // We'll sort client-side if createdAt exists
      const q = query(
        collection(db, collectionName),
        limit(limitCount)
      );
      
      console.log(`[Firestore] Fetching documents without ordering...`);
      const querySnapshot = await getDocs(q);
      console.log(`[Firestore] ✅ Query succeeded!`);
      
      console.log(`[Firestore] 📊 Got ${querySnapshot.size} documents from ${collectionName}`);
      console.log(`[Firestore] Query snapshot empty:`, querySnapshot.empty);
      
      const documents: FirestoreDocument[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`[Firestore] Processing document ${doc.id}:`, Object.keys(data));
        
        // Handle both createdAt and created_at fields
        const createdAtTimestamp = data.created_at?.toDate?.() || data.createdAt?.toDate?.() || data.created_at || data.createdAt;
        const updatedAtTimestamp = data.modified_at?.toDate?.() || data.updated_at?.toDate?.() || data.updatedAt?.toDate?.() || data.modified_at || data.updated_at || data.updatedAt;
        
        documents.push({
          id: doc.id,
          data: {
            ...data,
            created_at: createdAtTimestamp,
            modified_at: updatedAtTimestamp,
            createdAt: createdAtTimestamp ? new Date(createdAtTimestamp) : undefined,
            updatedAt: updatedAtTimestamp ? new Date(updatedAtTimestamp) : undefined,
          },
          createdAt: createdAtTimestamp ? new Date(createdAtTimestamp) : undefined,
          updatedAt: updatedAtTimestamp ? new Date(updatedAtTimestamp) : undefined,
        });
      });
      
      // Sort by createdAt/created_at if available, otherwise keep original order
      if (documents.every(d => d.createdAt)) {
        documents.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
      }
      
      console.log(`[Firestore] ✅ Returning ${documents.length} documents from ${collectionName}`);
      return documents;
    } catch (error: any) {
      console.error(`[Firestore] ❌ ERROR fetching collection ${collectionName}:`, error);
      console.error(`[Firestore] Error code:`, error.code);
      console.error(`[Firestore] Error message:`, error.message);
      console.error(`[Firestore] Full error:`, error);
      // If it's a permission error, provide helpful message
      if (error.code === 'permission-denied') {
        throw new Error(`Permission denied: Check Firestore security rules for collection '${collectionName}'. See FIRESTORE_RULES_FIX.md for instructions.`);
      }
      throw error;
    }
  }

  /**
   * Get documents by agent type
   */
  static async getDocumentsByAgent(agentType: string, limitCount: number = 50) {
    try {
      // Map agent types to collection names (with agent_ prefix)
      const collectionMap: Record<string, string> = {
        evaluation_agent: 'agent_evaluations',
        scenario_agent: 'agent_scenarios',
        notification_agent: 'agent_notifications',
        coa_agent: 'agent_coa_reports',
      };

      const collectionName = collectionMap[agentType] || agentType;
      return this.getCollection(collectionName, limitCount);
    } catch (error) {
      console.error(`Error fetching documents for ${agentType}:`, error);
      throw error;
    }
  }

  /**
   * Get recent evaluations
   */
  static async getRecentEvaluations(limitCount: number = 20) {
    return this.getCollection('agent_evaluations', limitCount);
  }

  /**
   * Get recent scenarios
   */
  static async getRecentScenarios(limitCount: number = 20) {
    return this.getCollection('agent_scenarios', limitCount);
  }

  /**
   * Get recent notifications
   */
  static async getRecentNotifications(limitCount: number = 20) {
    return this.getCollection('agent_notifications', limitCount);
  }

  /**
   * Get recent COA reports
   */
  static async getRecentCOAReports(limitCount: number = 20) {
    return this.getCollection('agent_coa_reports', limitCount);
  }

  /**
   * Helper function to convert Firestore snapshot to FirestoreDocument array
   */
  private static snapshotToDocuments(querySnapshot: QuerySnapshot): FirestoreDocument[] {
    const documents: FirestoreDocument[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Handle both createdAt and created_at fields
      const createdAtTimestamp = data.created_at?.toDate?.() || data.createdAt?.toDate?.() || data.created_at || data.createdAt;
      const updatedAtTimestamp = data.modified_at?.toDate?.() || data.updated_at?.toDate?.() || data.updatedAt?.toDate?.() || data.modified_at || data.updated_at || data.updatedAt;
      
      documents.push({
        id: doc.id,
        data: {
          ...data,
          created_at: createdAtTimestamp,
          modified_at: updatedAtTimestamp,
          createdAt: createdAtTimestamp ? new Date(createdAtTimestamp) : undefined,
          updatedAt: updatedAtTimestamp ? new Date(updatedAtTimestamp) : undefined,
        },
        createdAt: createdAtTimestamp ? new Date(createdAtTimestamp) : undefined,
        updatedAt: updatedAtTimestamp ? new Date(updatedAtTimestamp) : undefined,
      });
    });
    
    // Sort by createdAt/created_at if available, otherwise keep original order
    if (documents.every(d => d.createdAt)) {
      documents.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    }
    
    return documents;
  }

  /**
   * Listen to collection changes in real-time
   * Returns an unsubscribe function to clean up the listener
   */
  static listenToCollection(
    collectionName: string,
    callback: (documents: FirestoreDocument[]) => void,
    onError?: (error: Error) => void,
    limitCount: number = 50
  ): () => void {
    try {
      console.log(`[Firestore] 🎧 Setting up listener for collection: ${collectionName}`);
      
      const q = query(
        collection(db, collectionName),
        limit(limitCount)
      );
      
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          console.log(`[Firestore] 📊 Snapshot update for ${collectionName}: ${querySnapshot.size} documents`);
          const documents = this.snapshotToDocuments(querySnapshot);
          callback(documents);
        },
        (error) => {
          console.error(`[Firestore] ❌ ERROR in listener for ${collectionName}:`, error);
          if (error.code === 'permission-denied') {
            const errorMsg = `Permission denied: Check Firestore security rules for collection '${collectionName}'. See FIRESTORE_RULES_FIX.md for instructions.`;
            if (onError) {
              onError(new Error(errorMsg));
            }
          } else if (onError) {
            onError(error);
          }
        }
      );
      
      return unsubscribe;
    } catch (error: any) {
      console.error(`[Firestore] ❌ ERROR setting up listener for ${collectionName}:`, error);
      if (onError) {
        onError(error);
      }
      // Return a no-op function if listener setup fails
      return () => {};
    }
  }

  /**
   * Listen to recent evaluations
   */
  static listenToEvaluations(
    callback: (documents: FirestoreDocument[]) => void,
    onError?: (error: Error) => void,
    limitCount: number = 20
  ): () => void {
    return this.listenToCollection('agent_evaluations', callback, onError, limitCount);
  }

  /**
   * Listen to recent scenarios - ordered by creation date (newest first)
   */
  static listenToScenarios(
    callback: (documents: FirestoreDocument[]) => void,
    onError?: (error: Error) => void,
    limitCount: number = 10
  ): () => void {
    try {
      console.log(`[Firestore] 🎧 Setting up listener for latest ${limitCount} scenarios`);
      
      const q = query(
        collection(db, 'agent_scenarios'),
        orderBy('created_at', 'desc'),
        limit(limitCount)
      );
      
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          console.log(`[Firestore] 📊 Snapshot update for scenarios: ${querySnapshot.size} documents`);
          const documents = this.snapshotToDocuments(querySnapshot);
          callback(documents);
        },
        (error) => {
          console.error(`[Firestore] ❌ ERROR in listener for scenarios:`, error);
          if (error.code === 'permission-denied') {
            const errorMsg = `Permission denied: Check Firestore security rules for collection 'agent_scenarios'. See FIRESTORE_RULES_FIX.md for instructions.`;
            if (onError) {
              onError(new Error(errorMsg));
            }
          } else if (onError) {
            onError(error);
          }
        }
      );
      
      return unsubscribe;
    } catch (error: any) {
      console.error(`[Firestore] ❌ ERROR setting up listener for scenarios:`, error);
      if (onError) {
        onError(error);
      }
      return () => {};
    }
  }

  /**
   * Listen to recent notifications
   */
  static listenToNotifications(
    callback: (documents: FirestoreDocument[]) => void,
    onError?: (error: Error) => void,
    limitCount: number = 20
  ): () => void {
    return this.listenToCollection('agent_notifications', callback, onError, limitCount);
  }

  /**
   * Listen to recent COA reports
   */
  static listenToCOAReports(
    callback: (documents: FirestoreDocument[]) => void,
    onError?: (error: Error) => void,
    limitCount: number = 20
  ): () => void {
    return this.listenToCollection('agent_coa_reports', callback, onError, limitCount);
  }

  /**
   * Listen to recent site reports
   */
  static listenToSiteReports(
    callback: (documents: FirestoreDocument[]) => void,
    onError?: (error: Error) => void,
    limitCount: number = 20
  ): () => void {
    return this.listenToCollection('agent_sites', callback, onError, limitCount);
  }

  /**
   * Listen to evaluations created after a specific date
   * This is more efficient than fetching all and filtering client-side
   */
  static listenToEvaluationsSince(
    sinceDate: Date,
    callback: (documents: FirestoreDocument[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    try {
      console.log(`[Firestore] 🎧 Setting up listener for evaluations since ${sinceDate.toISOString()}`);
      
      const sinceTimestamp = Timestamp.fromDate(sinceDate);
      
      const q = query(
        collection(db, 'agent_evaluations'),
        where('created_at', '>=', sinceTimestamp),
        orderBy('created_at', 'desc')
      );
      
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          console.log(`[Firestore] 📊 Snapshot update for evaluations since ${sinceDate.toISOString()}: ${querySnapshot.size} documents`);
          const documents = this.snapshotToDocuments(querySnapshot);
          callback(documents);
        },
        (error) => {
          console.error(`[Firestore] ❌ ERROR in listener for evaluations since:`, error);
          if (error.code === 'permission-denied') {
            const errorMsg = `Permission denied: Check Firestore security rules for collection 'agent_evaluations'. See FIRESTORE_RULES_FIX.md for instructions.`;
            if (onError) {
              onError(new Error(errorMsg));
            }
          } else if (onError) {
            onError(error);
          }
        }
      );
      
      return unsubscribe;
    } catch (error: any) {
      console.error(`[Firestore] ❌ ERROR setting up listener for evaluations since:`, error);
      if (onError) {
        onError(error);
      }
      return () => {};
    }
  }

  /**
   * Listen to notifications created after a specific date
   */
  static listenToNotificationsSince(
    sinceDate: Date,
    callback: (documents: FirestoreDocument[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    try {
      console.log(`[Firestore] 🎧 Setting up listener for notifications since ${sinceDate.toISOString()}`);
      
      const sinceTimestamp = Timestamp.fromDate(sinceDate);
      
      const q = query(
        collection(db, 'agent_notifications'),
        where('created_at', '>=', sinceTimestamp),
        orderBy('created_at', 'desc')
      );
      
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          console.log(`[Firestore] 📊 Snapshot update for notifications since ${sinceDate.toISOString()}: ${querySnapshot.size} documents`);
          const documents = this.snapshotToDocuments(querySnapshot);
          callback(documents);
        },
        (error) => {
          console.error(`[Firestore] ❌ ERROR in listener for notifications since:`, error);
          if (error.code === 'permission-denied') {
            const errorMsg = `Permission denied: Check Firestore security rules for collection 'agent_notifications'. See FIRESTORE_RULES_FIX.md for instructions.`;
            if (onError) {
              onError(new Error(errorMsg));
            }
          } else if (onError) {
            onError(error);
          }
        }
      );
      
      return unsubscribe;
    } catch (error: any) {
      console.error(`[Firestore] ❌ ERROR setting up listener for notifications since:`, error);
      if (onError) {
        onError(error);
      }
      return () => {};
    }
  }

  /**
   * Listen to a specific document in agent_states collection
   */
  static listenToAgentState(
    documentId: string,
    callback: (data: Record<string, any> | null) => void,
    onError?: (error: Error) => void
  ): () => void {
    try {
      console.log(`[Firestore] 🎧 Setting up listener for agent_states/${documentId}`);
      console.log(`[Firestore] 🔗 Firebase instance ID:`, db.app.name);
      console.log(`[Firestore] 🔗 Project ID:`, db.app.options.projectId);
      
      const docRef = doc(db, 'agent_states', documentId);
      
      // Track metadata changes to verify real-time sync
      let lastUpdateTime: number | null = null;
      let updateCount = 0;
      
      const unsubscribe = onSnapshot(
        docRef,
        (documentSnapshot: DocumentSnapshot) => {
          updateCount++;
          const now = Date.now();
          const timeSinceLastUpdate = lastUpdateTime ? now - lastUpdateTime : 0;
          lastUpdateTime = now;
          
          // Log sync verification info
          console.log(`[Firestore] 🔔 Snapshot #${updateCount} received at ${new Date().toISOString()}`);
          console.log(`[Firestore] ⏱️ Time since last update: ${timeSinceLastUpdate}ms`);
          console.log(`[Firestore] 📍 Metadata:`, {
            fromCache: documentSnapshot.metadata.fromCache,
            hasPendingWrites: documentSnapshot.metadata.hasPendingWrites,
            isEqual: documentSnapshot.metadata.isEqual
          });
          
          if (documentSnapshot.exists()) {
            const data = documentSnapshot.data();
            console.log(`[Firestore] 📊 Snapshot update for agent_states/${documentId}:`, data);
            console.log(`[Firestore] ✅ This update will sync to ALL browser tabs/windows`);
            callback(data);
          } else {
            console.log(`[Firestore] 📊 Document agent_states/${documentId} does not exist`);
            callback(null);
          }
        },
        (error) => {
          console.error(`[Firestore] ❌ ERROR in listener for agent_states/${documentId}:`, error);
          console.error(`[Firestore] ❌ Error details:`, {
            code: error.code,
            message: error.message,
            stack: error.stack
          });
          if (error.code === 'permission-denied') {
            const errorMsg = `Permission denied: Check Firestore security rules for collection 'agent_states'. See FIRESTORE_RULES_FIX.md for instructions.`;
            if (onError) {
              onError(new Error(errorMsg));
            }
          } else if (onError) {
            onError(error);
          }
        }
      );
      
      console.log(`[Firestore] ✅ Listener active - changes will sync across ALL tabs/browsers`);
      
      return unsubscribe;
    } catch (error: any) {
      console.error(`[Firestore] ❌ ERROR setting up listener for agent_states/${documentId}:`, error);
      if (onError) {
        onError(error);
      }
      return () => {};
    }
  }
}

