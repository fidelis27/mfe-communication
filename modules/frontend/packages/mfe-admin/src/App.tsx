import React from "react";
import AdminWorkspace from "./features/admin/AdminWorkspace";
import styles from "./App.module.css";

export default function App() {
  return (
    <div className={styles.appRoot}>
      <AdminWorkspace />
    </div>
  );
}
