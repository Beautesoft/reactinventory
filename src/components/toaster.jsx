import { Toaster } from 'sonner';

const Layout = ({ children }) => {
  return (
    <>
      <Toaster richColors />
      <div className="flex w-full h-screen overflow-hidden">
        {/* ...existing layout code */}
      </div>
    </>
  );
};