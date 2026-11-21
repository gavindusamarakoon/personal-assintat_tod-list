import React from "react";

export default function Button({
  children,
  onClick,
  variant = "primary", // primary | secondary | outline | link
  loading,
  disabled,
  type = "button",
}) {
  const className = `btn btn-${variant}`;
  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}
