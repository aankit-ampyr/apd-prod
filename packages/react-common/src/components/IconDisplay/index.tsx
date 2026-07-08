import { useState } from "react";
import { Icons } from "../../assets";
import { Icon, Tooltip, TextInput } from "../../ui-kit";

export function IconDisplay() {
  const [searchTerm, setSearchTerm] = useState("");
  const iconsKeys = Object.keys(Icons).filter((iconName) =>
    iconName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <div className="my-5 flex flex-col gap-3">
      <TextInput
        placeholder="Search icons..."
        className="mb-4"
        value={searchTerm}
        onChange={setSearchTerm}
      />
      <div className="flex flex-wrap gap-4">
        {iconsKeys.map((iconName, index) => (
          <div key={`icon-${iconName}-${index}`} className="relative group">
            <Tooltip message={iconName} position="top" portal />
            <Icon name={iconName as any} />
          </div>
        ))}
      </div>
    </div>
  );
}
