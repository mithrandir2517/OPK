const admin = require('firebase-admin');
const { Expo } = require('expo-server-sdk');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');

admin.initializeApp();

const expo = new Expo();

function dedupeStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.trim()))];
}

async function loadRecipientTokens(uid) {
  const snapshot = await admin.firestore().collection('users').doc(uid).collection('pushTokens').get();

  return snapshot.docs
    .map((document) => document.data())
    .filter((data) => data && data.enabled !== false && typeof data.token === 'string')
    .map((data) => data.token)
    .filter((token) => Expo.isExpoPushToken(token));
}

async function sendExpoPushNotifications(messages) {
  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    await expo.sendPushNotificationsAsync(chunk);
  }
}

exports.sendPartyEventPush = onDocumentCreated('parties/{partyCode}/events/{eventId}', async (event) => {
  const snapshot = event.data;

  if (!snapshot) {
    return;
  }

  const payload = snapshot.data();
  const partyCode = String(event.params.partyCode || '').trim();
  const title = typeof payload.title === 'string' && payload.title.trim() ? payload.title.trim() : 'OPK';
  const body = typeof payload.body === 'string' && payload.body.trim() ? payload.body.trim() : title;
  const actorUid = typeof payload.actorUid === 'string' && payload.actorUid.trim() ? payload.actorUid.trim() : null;
  const actorName = typeof payload.actorName === 'string' && payload.actorName.trim() ? payload.actorName.trim() : 'Někdo';

  const partyDoc = await admin.firestore().collection('parties').doc(partyCode).get();

  if (!partyDoc.exists) {
    return;
  }

  const partyData = partyDoc.data() || {};
  const memberUids = dedupeStrings(
    Array.isArray(partyData.members)
      ? partyData.members
          .map((member) => (member && typeof member === 'object' ? member.uid : null))
          .filter(Boolean)
      : [],
  );

  const creatorUid = typeof partyData.creatorUid === 'string' && partyData.creatorUid.trim() ? partyData.creatorUid.trim() : null;
  const recipientUids = dedupeStrings([creatorUid, ...memberUids]).filter((uid) => uid !== actorUid);

  const tokenLists = await Promise.all(recipientUids.map((uid) => loadRecipientTokens(uid)));
  const tokens = dedupeStrings(tokenLists.flat());

  if (tokens.length === 0) {
    return;
  }

  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data: {
      partyCode,
      eventType: payload.type || 'unknown',
      actorName,
    },
  }));

  await sendExpoPushNotifications(messages);
});
