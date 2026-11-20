// Browser entry of the admin: starts the app of the current page (editor, file library or user admin).
import { startEditor } from "@cms/browser/editor/start-editor";
import initFileLibrary from "@cms/browser/file-library/file-library";
import initPageFilter from "@cms/browser/page-list";
import initUserAdmin from "@cms/browser/user-admin/user-admin";
import { localizeTimes } from "@cms/browser/utils/format-time";

localizeTimes();

const editor = document.getElementById("editor");
const data = document.getElementById("cms-editor");
if (editor && data) {
  startEditor(editor, JSON.parse(data.textContent));
}

const pageFilter = document.getElementById("page-filter");
if (pageFilter instanceof HTMLInputElement) {
  initPageFilter(pageFilter);
}

const library = document.getElementById("file-library");
if (library) {
  initFileLibrary(library);
}

const users = document.getElementById("user-admin");
if (users) {
  initUserAdmin(users);
}
