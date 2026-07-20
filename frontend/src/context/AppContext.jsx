import { createContext, useContext, useReducer, useEffect } from 'react';
import { campers as seedCampers } from '../data/campers';

const AppContext = createContext(null);

// Load state from localStorage
function loadState() {
  try {
    const saved = localStorage.getItem('campDavid2026');
    if (saved) return JSON.parse(saved);
  } catch (e) { /* ignore */ }
  return null;
}

const initialState = {
  currentUser: null,
  campers: seedCampers,
  attendance: {},    // { "wed-arrival": { "c1": "present", "c2": "absent" } }
  incidents: [
    // Sample incidents
    {
      id: 'inc1',
      camperId: 'c1',
      type: 'medical',
      description: 'Camper experienced mild allergic reaction after lunch. EpiPen was not needed. Monitored for 2 hours.',
      reportedBy: 's2',
      reportedAt: '2026-07-29T14:15:00',
      status: 'open',
    },
    {
      id: 'inc2',
      camperId: 'c8',
      type: 'welfare',
      description: 'Camper feeling homesick and withdrawn from group activities. Counsellor assigned.',
      reportedBy: 's5',
      reportedAt: '2026-07-29T16:30:00',
      status: 'in_progress',
    },
  ],
  announcements: [
    {
      id: 'ann1',
      text: 'Medical team needed at Block B immediately. Camper with suspected allergic reaction.',
      author: 's2',
      createdAt: '2026-07-29T14:15:00',
      urgent: true,
      day: 'wed',
    },
    {
      id: 'ann2',
      text: 'All team leads: submit registration forms to the admin desk before 4:00 PM today.',
      author: 's1',
      createdAt: '2026-07-29T12:30:00',
      urgent: false,
      day: 'wed',
    },
    {
      id: 'ann3',
      text: 'First roll call at 5:30 PM. Have your group assembled at the field gate by 5:25 PM.',
      author: 's3',
      createdAt: '2026-07-29T11:02:00',
      urgent: false,
      day: 'wed',
    },
  ],
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, currentUser: action.payload };

    case 'LOGOUT':
      return { ...state, currentUser: null };

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
      return { ...action.payload, currentUser: state.currentUser };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const saved = loadState();
  const init = saved ? { ...initialState, ...saved, currentUser: null } : initialState;
  const [state, dispatch] = useReducer(reducer, init);

  // Persist to localStorage on every state change (except currentUser)
  useEffect(() => {
    const { currentUser, ...rest } = state;
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
