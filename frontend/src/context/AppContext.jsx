import { createContext, useContext, useReducer, useEffect } from 'react';
import { campers as seedCampers } from '../data/campers';

const AppContext = createContext(null);

function loadState() {
  try {
    const saved = localStorage.getItem('campDavid2026');
    if (saved) return JSON.parse(saved);
  } catch (e) { /* ignore */ }
  return null;
}

const initialState = {
  currentUser: null, // includes token, permissions, role, etc.
  notifications: [],
  campers: seedCampers,
  attendance: {},
  incidents: [],
  announcements: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      // Store token securely
      sessionStorage.setItem('camp_token', action.payload.token);
      return { ...state, currentUser: action.payload.user };

    case 'LOGOUT':
      sessionStorage.removeItem('camp_token');
      return { ...state, currentUser: null, notifications: [] };

    case 'UPDATE_PROFILE':
      return {
        ...state,
        currentUser: { ...state.currentUser, ...action.payload }
      };

    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.payload };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, isRead: true } : n
        )
      };

    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, isRead: true }))
      };

    case 'SET_ATTENDANCE': {
      const { sessionKey, camperId, status } = action.payload;
      return {
        ...state,
        attendance: {
          ...state.attendance,
          [sessionKey]: {
            ...(state.attendance[sessionKey] || {}),
            [camperId]: status,
          },
        },
      };
    }

    case 'BULK_ATTENDANCE': {
      const { sessionKey, camperIds, status } = action.payload;
      const sessionData = { ...(state.attendance[sessionKey] || {}) };
      camperIds.forEach((id) => { sessionData[id] = status; });
      return {
        ...state,
        attendance: { ...state.attendance, [sessionKey]: sessionData },
      };
    }

    case 'ADD_INCIDENT':
      return { ...state, incidents: [action.payload, ...state.incidents] };

    case 'UPDATE_INCIDENT_STATUS':
      return {
        ...state,
        incidents: state.incidents.map((inc) =>
          inc.id === action.payload.id ? { ...inc, status: action.payload.status } : inc
        ),
      };

    case 'ADD_ANNOUNCEMENT':
      return { ...state, announcements: [action.payload, ...state.announcements] };

    case 'ADD_CAMPERS':
      return { ...state, campers: [...state.campers, ...action.payload] };

    case 'LOAD_STATE':
      return { ...action.payload, currentUser: state.currentUser, notifications: state.notifications };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const saved = loadState();
  const init = saved ? { ...initialState, ...saved, currentUser: null, notifications: [] } : initialState;
  const [state, dispatch] = useReducer(reducer, init);

  useEffect(() => {
    const { currentUser, notifications, ...rest } = state;
    localStorage.setItem('campDavid2026', JSON.stringify(rest));
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
