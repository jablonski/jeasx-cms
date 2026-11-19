import { defineBlock } from "@cms/shared/blocks";
import Heading from "./Heading";
import OptionalText from "./OptionalText";

export default defineBlock({
  type: "team",
  label: "Team",
  icon: "☺",
  description: "People with photo, role and short bio",
  fields: {
    heading: { type: "text", label: "Heading" },
    members: {
      type: "list",
      label: "People",
      itemLabel: "name",
      fields: {
        photo: { type: "image", label: "Photo" },
        name: { type: "text", label: "Name", required: true },
        role: { type: "text", label: "Role" },
        bio: { type: "textarea", label: "Short bio" },
      },
    },
  },
  Component({ heading, members, field }) {
    return (
      <section class="block-team">
        <Heading text={heading} field={field} />
        <ul>
          {members.map(({ photo, name, role, bio }, i) => (
            <li>
              {photo && <img src={photo} alt="" loading="lazy" />}
              <h3 {...field(`members.${i}.name`)}>{name}</h3>
              <OptionalText
                as="p"
                class="role"
                value={role}
                name={`members.${i}.role`}
                field={field}
              />
              <OptionalText as="p" value={bio} name={`members.${i}.bio`} field={field} />
            </li>
          ))}
        </ul>
      </section>
    );
  },
});
