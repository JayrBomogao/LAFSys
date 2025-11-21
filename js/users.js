// Sample staff users data and simple accessor
(function(){
  const w = window;
  const UsersStore = {
    users: [
      { id: 1, name: 'Maria Santos', role: 'Admin', email: 'maria.santos@lafsys.gov', status: 'Active' },
      { id: 2, name: 'Juan Dela Cruz', role: 'Staff', email: 'juan.delacruz@lafsys.gov', status: 'Active' },
      { id: 3, name: 'Ana Reyes', role: 'Staff', email: 'ana.reyes@lafsys.gov', status: 'Active' },
      { id: 4, name: 'Carlos Garcia', role: 'Staff', email: 'carlos.garcia@lafsys.gov', status: 'Active' },
      { id: 5, name: 'Lara Mendoza', role: 'Admin', email: 'lara.mendoza@lafsys.gov', status: 'Active' }
    ],
    getAll() { return [...this.users]; }
  };
  w.UsersStore = UsersStore;
})();
