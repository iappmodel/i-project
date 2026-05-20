import React from "react";

const StudioShell: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  return <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#05060a", color: "#e6eef8" }}>{children}</div>;
};

export default StudioShell;

