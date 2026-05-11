import { Loader2 } from "lucide-react";

function PageLoader({ fullScreen = true }) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${
        fullScreen ? "h-screen" : "min-h-[400px] py-12"
      }`}
    >
      <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
      <span className="text-gray-600 mt-4 text-sm">Loading...</span>
    </div>
  );
}

export default PageLoader;
