const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const fallbackUsersByEmail = new Map();
const fallbackUsersById = new Map();
const fallbackGroupsById = new Map();
const fallbackGroupsByCode = new Map();
const fallbackPreferencesByGroupId = new Map();

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

const isMongoReady = () => mongoose.connection.readyState === 1;

const createFallbackUser = async ({ name, email, password }) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = crypto.randomUUID();
  const user = {
    _id: userId,
    id: userId,
    name,
    email: normalizeEmail(email),
    password: hashedPassword,
    createdAt: new Date()
  };

  fallbackUsersByEmail.set(user.email, user);
  fallbackUsersById.set(user.id, user);
  fallbackUsersById.set(user._id, user);

  return user;
};

const getFallbackUserByEmail = (email) => {
  return fallbackUsersByEmail.get(normalizeEmail(email));
};

const getFallbackUserById = (id) => {
  const key = String(id);
  if (fallbackUsersById.has(key)) {
    return fallbackUsersById.get(key);
  }

  return Array.from(fallbackUsersById.values()).find((candidate) =>
    String(candidate._id) === key || String(candidate.id) === key
  );
};

const generateFallbackGroupCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';

  for (let i = 0; i < 6; i += 1) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return code;
};

const addFallbackGroup = (group) => {
  const normalizedCode = String(group.code).toUpperCase();
  fallbackGroupsById.set(group._id, group);
  fallbackGroupsByCode.set(normalizedCode, group);
  return group;
};

const getFallbackGroupById = (id) => {
  return fallbackGroupsById.get(String(id));
};

const getFallbackGroupByCode = (code) => {
  return fallbackGroupsByCode.get(String(code).toUpperCase());
};

const getFallbackUserGroups = (userId) => {
  const normalizedUserId = String(userId);
  return Array.from(fallbackGroupsById.values()).filter((group) =>
    group.members.some((member) => String(member.user) === normalizedUserId)
  );
};

const presentFallbackGroup = (group) => {
  if (!group) return null;
  const presentUser = (userId) => {
    const user = getFallbackUserById(userId);
    return user ? { _id: user._id, id: user.id, name: user.name, email: user.email } : { _id: userId, name: 'Group member', email: '' };
  };

  return {
    ...group,
    creator: presentUser(group.creator),
    members: group.members.map((member) => ({
      ...member,
      user: presentUser(member.user)
    }))
  };
};

const getFallbackUsers = () => Array.from(fallbackUsersByEmail.values());

const getFallbackGroupPreferences = (groupId) => {
  return fallbackPreferencesByGroupId.get(String(groupId)) || [];
};

const getFallbackUserPreference = (groupId, userId) => {
  return getFallbackGroupPreferences(groupId).find(
    (preference) => String(preference.user) === String(userId)
  ) || null;
};

const saveFallbackPreference = (preference) => {
  const groupId = String(preference.group);
  const preferences = getFallbackGroupPreferences(groupId);
  const existingIndex = preferences.findIndex(
    (item) => String(item.user) === String(preference.user)
  );

  if (existingIndex >= 0) {
    preferences[existingIndex] = preference;
  } else {
    preferences.push(preference);
  }

  fallbackPreferencesByGroupId.set(groupId, preferences);
  return preference;
};

module.exports = {
  normalizeEmail,
  isMongoReady,
  createFallbackUser,
  getFallbackUserByEmail,
  getFallbackUserById,
  getFallbackUsers,
  generateFallbackGroupCode,
  addFallbackGroup,
  getFallbackGroupById,
  getFallbackGroupByCode,
  getFallbackUserGroups,
  presentFallbackGroup,
  getFallbackGroupPreferences,
  getFallbackUserPreference,
  saveFallbackPreference
};
