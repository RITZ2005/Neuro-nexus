// Update this page (the content is just a fallback if you fail to update the page)

import { Navigate } from "react-router-dom";

const Index = () => {
  // Redirect to landing page
  return <Navigate to="/" replace />;
};

export default Index;
