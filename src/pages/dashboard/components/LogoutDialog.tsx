interface LogoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LogoutDialog({ isOpen, onClose }: LogoutDialogProps) {
  const handleLogout = () => {
    // Clear any stored authentication data
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    sessionStorage.clear();
    
    // Show success message
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-teal-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
    toast.innerHTML = `
      <i class="ri-check-line text-lg"></i>
      <span class="font-medium">Logged out successfully</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
      // Redirect to login page or home
      window.location.href = '/';
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <i className="ri-logout-box-r-line text-red-600 dark:text-red-400 text-2xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Confirm Logout
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to log out?
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <i className="ri-information-line text-teal-600 dark:text-teal-400 text-lg mt-0.5"></i>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <p className="font-medium mb-1">Before you go:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• All unsaved changes will be lost</li>
                    <li>• Your session will be terminated</li>
                    <li>• You'll need to log in again to access the dashboard</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
