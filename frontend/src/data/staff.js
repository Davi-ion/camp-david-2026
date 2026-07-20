// 6 staff accounts — PINs are simple 4-digit codes for prototype
export const staff = [
  // Admins — full access, no group restriction
  {
    id: 's1',
    name: 'Tunde Kayode',
    pin: '1111',
    role: 'admin',
    group: null,
  },
  {
    id: 's2',
    name: 'Pastor Kemi',
    pin: '2222',
    role: 'admin',
    group: null,
  },
  // Team Leads — manage their own group
  {
    id: 's3',
    name: 'Bro Emmanuel',
    pin: '3333',
    role: 'team_lead',
    group: 'eagles',
  },
  {
    id: 's4',
    name: 'Sis Funke',
    pin: '4444',
    role: 'team_lead',
    group: 'lions',
  },
  // Staff / Volunteers
  {
    id: 's5',
    name: 'David Obi',
    pin: '5555',
    role: 'staff',
    group: 'flames',
  },
  {
    id: 's6',
    name: 'Grace Martins',
    pin: '6666',
    role: 'staff',
    group: 'arrows',
  },
];

export const ROLES = {
  admin: { label: 'Admin', level: 3 },
  team_lead: { label: 'Team Lead', level: 2 },
  staff: { label: 'Staff', level: 1 },
};
