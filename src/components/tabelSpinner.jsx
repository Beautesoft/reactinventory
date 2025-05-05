import React from "react";
import { Loader } from "lucide-react"; // Import spinner icon from lucide-react

function TableSpinner({ colSpan = 1, message = "Loading..." }) {
  return (
    <tr className=''>
      <td colSpan={colSpan} className="text-center py-44">
        <div className="flex flex-col items-center justify-center space-y-2">
          {/* Spinner Icon */}
          <Loader className="w-8 h-8 text-gray-500 animate-spin" />
          {/* Loading Message */}
          <span className="text-gray-600 text-sm">{message}</span>
        </div>
      </td>
    </tr>
  );
}

export default TableSpinner;