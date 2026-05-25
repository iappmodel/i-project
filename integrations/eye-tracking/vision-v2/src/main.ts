import "./styles.css";
import { AppController } from "./app/AppController";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("Missing #app root node");

new AppController(root);

