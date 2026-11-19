// Browser entry of the admin: starts the app of the current page (editor, file library or user admin).
import { startEditor } from "@cms/browser/editor/start-editor";
import initFileLibrary from "@cms/browser/file-library/file-library";
import { localizeTimes } from "@cms/browser/shared/format-time";
import initUserAdmin from "@cms/browser/user-admin/user-admin";

localizeTimes();

const editor = document.getElementById("editor");
const data = document.getElementById("cms-editor");
if (editor && data) {
  startEditor(editor, JSON.parse(data.textContent));
}

const library = document.getElementById("file-library");
if (library) {
  initFileLibrary(library);
}

const users = document.getElementById("user-admin");
if (users) {
  initUserAdmin(users);
}
