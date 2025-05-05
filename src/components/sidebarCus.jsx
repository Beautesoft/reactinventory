import { Sidebar } from '@/components/ui/sidebar';
import React, { useState } from 'react';
// import { Sidebar } from '@shadcn/ui';
import { FiHome, FiPackage, FiUser, FiMenu } from 'react-icons/fi'; // Menu icon
import { Link } from 'react-router-dom'; // Import Link from react-router-dom

const MySidebar = () => {
  const [open, setOpen] = useState(false); // Sidebar open/close state

  // Dynamic navigation links
  const navItems = [
    { label: 'Dashboard', icon: <FiHome className="text-xl" />, to: '/dashboard' },
    { label: 'Products', icon: <FiPackage className="text-xl" />, to: '/products' },
    { label: 'Customers', icon: <FiUser className="text-xl" />, to: '/customers' },
  ];

  return (
    <div className="flex">
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setOpen(!open)} // Toggle the sidebar
        className="lg:hidden p-4 text-white bg-gray-800"
      >
        <FiMenu className="text-2xl" />
      </button>

      {/* Sidebar */}
      <Sidebar
        open={open} 
        onOpenChange={setOpen}
        className={`lg:w-64 w-full h-full bg-gray-800 text-white transition-all duration-300 transform ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <Sidebar.Header>
          <h2 className="text-2xl font-semibold p-4">My Inventory App</h2>
        </Sidebar.Header>

        {/* Sidebar Body (Navigation Links) */}
        <Sidebar.Body>
          <ul>
            {navItems.map((item, index) => (
              <li key={index} className="flex items-center space-x-3 py-3 px-4 hover:bg-gray-700">
                {item.icon}
                {/* Use Link instead of a */}
                <Link to={item.to}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </Sidebar.Body>

        {/* Sidebar Footer (Optional) */}
        <Sidebar.Footer>
          <div className="text-center py-4">
            <p className="text-sm">© 2025 My Inventory App</p>
          </div>
        </Sidebar.Footer>
      </Sidebar>

      {/* Main Content Area */}
      <div className="flex-grow p-4">
        {/* Your main content */}
        <h1 className="text-2xl">Welcome to My Inventory App</h1>
      </div>
    </div>
  );
};

export default MySidebar;