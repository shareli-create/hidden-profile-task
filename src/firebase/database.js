import { collection, doc, addDoc, updateDoc, getDocs, onSnapshot, query, where, orderBy, serverTimestamp, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from './config';

export const createSession = async (sessionData) => {
  try {
    const docRef = await addDoc(collection(db, 'sessions'), {
      ...sessionData,
      createdAt: serverTimestamp(),
      status: 'active',
      currentStage: 'identity'
    });
    return { id: docRef.id, success: true };
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

export const getSession = (sessionId, callback) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  return onSnapshot(sessionRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() });
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error listening to session:', error);
    callback(null);
  });
};

export const updateSessionStage = async (sessionId, stage, additionalData = {}) => {
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      currentStage: stage,
      updatedAt: serverTimestamp(),
      ...additionalData
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating session stage:', error);
    throw error;
  }
};

export const addParticipant = async (sessionId, participantData) => {
  try {
    const docRef = await addDoc(collection(db, 'participants'), {
      sessionId,
      ...participantData,
      joinedAt: serverTimestamp(),
      status: 'active'
    });
    return { id: docRef.id, success: true };
  } catch (error) {
    console.error('Error adding participant:', error);
    throw error;
  }
};

export const getParticipants = (sessionId, callback) => {
  const q = query(
    collection(db, 'participants'),
    where('sessionId', '==', sessionId),
    where('status', '==', 'active'),
    orderBy('joinedAt', 'asc')
  );
  return onSnapshot(q, (querySnapshot) => {
    const participants = [];
    querySnapshot.forEach((docSnap) => {
      participants.push({ id: docSnap.id, ...docSnap.data() });
    });
    callback(participants);
  }, (error) => {
    console.error('Error listening to participants:', error);
    callback([]);
  });
};

export const createGroups = async (sessionId, groups) => {
  try {
    const batch = [];
    for (const group of groups) {
      const docRef = await addDoc(collection(db, 'groups'), {
        sessionId,
        ...group,
        readyMembers: {},
        approvals: {},
        createdAt: serverTimestamp()
      });
      batch.push({ id: docRef.id, ...group });
    }
    return { groups: batch, success: true };
  } catch (error) {
    console.error('Error creating groups:', error);
    throw error;
  }
};

export const getGroups = (sessionId, callback) => {
  const q = query(
    collection(db, 'groups'),
    where('sessionId', '==', sessionId),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (querySnapshot) => {
    const groups = [];
    querySnapshot.forEach((docSnap) => {
      groups.push({ id: docSnap.id, ...docSnap.data() });
    });
    callback(groups);
  }, (error) => {
    console.error('Error listening to groups:', error);
    callback([]);
  });
};

export const markParticipantReady = async (sessionId, groupId, participantId, individualData) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) {
      throw new Error('Group not found');
    }
    const currentData = groupDoc.data();
    const readyMembers = currentData.readyMembers || {};
    readyMembers[participantId] = {
      ready: true,
      individualChoice: individualData.individualChoice,
      timestamp: serverTimestamp()
    };
    await updateDoc(groupRef, {
      readyMembers,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error marking participant ready:', error);
    throw error;
  }
};

export const submitDecision = async (sessionId, groupId, decisionData) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      groupDecision: {
        choice: decisionData.choice,
        submittedBy: decisionData.submittedBy,
        timestamp: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error submitting group decision:', error);
    throw error;
  }
};

export const approveGroupDecision = async (sessionId, groupId, participantId, approved) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) {
      throw new Error('Group not found');
    }
    const currentData = groupDoc.data();
    const approvals = currentData.approvals || {};
    approvals[participantId] = approved;
    await updateDoc(groupRef, {
      approvals,
      updatedAt: serverTimestamp()
    });
    const allMembers = currentData.members || [];
    const allApproved = allMembers.every(m => approvals[m.id] === true);
    if (allApproved) {
      await addDoc(collection(db, 'decisions'), {
        sessionId,
        groupId,
        groupName: currentData.name,
        choice: currentData.groupDecision.choice,
        submittedBy: currentData.groupDecision.submittedBy,
        individualChoices: currentData.readyMembers,
        approvedAt: serverTimestamp()
      });
    }
    return { success: true };
  } catch (error) {
    console.error('Error approving decision:', error);
    throw error;
  }
};

export const getDecisions = (sessionId, callback) => {
  const q = query(
    collection(db, 'decisions'),
    where('sessionId', '==', sessionId),
    orderBy('approvedAt', 'desc')
  );
  return onSnapshot(q, (querySnapshot) => {
    const decisions = [];
    querySnapshot.forEach((docSnap) => {
      decisions.push({ id: docSnap.id, ...docSnap.data() });
    });
    callback(decisions);
  }, (error) => {
    console.error('Error listening to decisions:', error);
    callback([]);
  });
};

export const checkSessionExists = async (sessionId) => {
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    const docSnap = await getDoc(sessionRef);
    return docSnap.exists();
  } catch (error) {
    console.error('Error checking session:', error);
    return false;
  }
};

export const getActiveSession = async () => {
  try {
    const q = query(
      collection(db, 'sessions'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting active session:', error);
    return null;
  }
};

export const createNewActiveSession = async (sessionData) => {
  try {
    const q = query(
      collection(db, 'sessions'),
      where('status', '==', 'active')
    );
    const querySnapshot = await getDocs(q);
    const updatePromises = [];
    querySnapshot.forEach((document) => {
      updatePromises.push(
        updateDoc(doc(db, 'sessions', document.id), {
          status: 'inactive',
          closedAt: serverTimestamp()
        })
      );
    });
    await Promise.all(updatePromises);
    const docRef = await addDoc(collection(db, 'sessions'), {
      ...sessionData,
      createdAt: serverTimestamp(),
      status: 'active',
      currentStage: 'identity'
    });
    return { id: docRef.id, success: true };
  } catch (error) {
    console.error('Error creating new active session:', error);
    throw error;
  }
};

export const subscribeToSession = (sessionId, callbacks) => {
  const unsubscribers = [];
  if (callbacks.onSessionUpdate) {
    const unsubSession = getSession(sessionId, callbacks.onSessionUpdate);
    unsubscribers.push(unsubSession);
  }
  if (callbacks.onParticipantsUpdate) {
    const unsubParticipants = getParticipants(sessionId, callbacks.onParticipantsUpdate);
    unsubscribers.push(unsubParticipants);
  }
  if (callbacks.onGroupsUpdate) {
    const unsubGroups = getGroups(sessionId, callbacks.onGroupsUpdate);
    unsubscribers.push(unsubGroups);
  }
  if (callbacks.onDecisionsUpdate) {
    const unsubDecisions = getDecisions(sessionId, callbacks.onDecisionsUpdate);
    unsubscribers.push(unsubDecisions);
  }
  return () => {
    unsubscribers.forEach(unsubscribe => unsubscribe && unsubscribe());
  };
};

export const submitGroupRatings = async (sessionId, groupId, ratingsData) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    
    await updateDoc(groupRef, {
      ratings: ratingsData.ratings,
      ratingsSubmittedBy: ratingsData.submittedBy,
      ratingsSubmittedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error submitting ratings:', error);
    throw error;
  }
};

export const deleteAllData = async () => {
  try {
    const collections = ['sessions', 'participants', 'groups', 'decisions'];
    
    for (const collectionName of collections) {
      const q = query(collection(db, collectionName));
      const querySnapshot = await getDocs(q);
      
      const deletePromises = [];
      querySnapshot.forEach((document) => {
        deletePromises.push(deleteDoc(doc(db, collectionName, document.id)));
      });
      
      await Promise.all(deletePromises);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting all data:', error);
    throw error;
  }
};