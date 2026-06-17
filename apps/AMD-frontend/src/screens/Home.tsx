import React from 'react';
import {useToast} from '@/hooks';
import {
  Toast,
  Text,
  type ToastType,
  DatePicker,
  Button,
  Avatar,
  Toggle,
  Checkbox,
  Radio,
  TextInput,
  TextArea,
  SelectInput,
  Badge,
  MultiSelectInput,
} from '@/ui-kits';

export const Home: React.FC = () => {
  const {showToast} = useToast();
  function handleShowToast(type: ToastType) {
    showToast('Hello, world!', type);
  }

  return (
    <div className="flex flex-col p-4">
      <Section title="DatePicker">
        <DatePicker label="Date" placeholder="Select Date" onDateChange={() => {}} />
      </Section>
      <Section title="Select Input">
        <SelectInput
          options={[
            {id: 1, label: 'Option 1'},
            {id: 2, label: 'Option 2'},
            {id: 3, label: 'Option 3'},
          ]}
          onChange={() => {}}
          value={1}
          placeholder="Select an option"
          label="Select an option"
          error="This is an error message"
          touched
          usePortal
          className="max-w-75"
          // helperText="This is an helper message"
          // leftIcon="mail"
        />
      </Section>

      <Section>
        <MultiSelectShowCase />
      </Section>

      <Section title="Badge">
        <div className="grid grid-cols-3 w-fit gap-4">
          {/* gray */}
          <Badge message="Label" color="gray" size="sm" />
          <Badge message="Label" color="gray" />
          <Badge message="Label" color="gray" size="lg" />

          {/* voilet */}
          <Badge message="Label" color="voilet" size="sm" />
          <Badge message="Label" color="voilet" />
          <Badge message="Label" color="voilet" size="lg" />

          {/* red */}
          <Badge message="Label" color="red" size="sm" />
          <Badge message="Label" color="red" />
          <Badge message="Label" color="red" size="lg" />

          {/* mustard */}
          <Badge message="Label" color="mustard" size="sm" />
          <Badge message="Label" color="mustard" />
          <Badge message="Label" color="mustard" size="lg" />

          {/* green */}
          <Badge message="Label" color="green" size="sm" />
          <Badge message="Label" color="green" />
          <Badge message="Label" color="green" size="lg" />

          {/* navy */}
          <Badge message="Label" color="navy" size="sm" />
          <Badge message="Label" color="navy" />
          <Badge message="Label" color="navy" size="lg" />

          {/* darkblue */}
          <Badge message="Label" color="darkblue" size="sm" />
          <Badge message="Label" color="darkblue" />
          <Badge message="Label" color="darkblue" size="lg" />

          {/* blue */}
          <Badge message="Label" color="blue" size="sm" />
          <Badge message="Label" color="blue" />
          <Badge message="Label" color="blue" size="lg" />

          {/* indigo */}
          <Badge message="Label" color="indigo" size="sm" />
          <Badge message="Label" color="indigo" />
          <Badge message="Label" color="indigo" size="lg" />

          {/* magenta */}
          <Badge message="Label" color="magenta" size="sm" />
          <Badge message="Label" color="magenta" />
          <Badge message="Label" color="magenta" size="lg" />

          {/* rose */}
          <Badge message="Label" color="rose" size="sm" />
          <Badge message="Label" color="rose" />
          <Badge message="Label" color="rose" size="lg" />

          {/* orange */}
          <Badge message="Label" color="orange" size="sm" />
          <Badge message="Label" color="orange" />
          <Badge message="Label" color="orange" size="lg" />
        </div>
      </Section>

      <Section title="Buttons ">
        <div className="grid p-4 mt-4 grid-cols-4 grid-row-4 gap-4">
          <div className="flex flex-col gap-2">
            <Button size="lg">Button Text</Button>
            <Button size="md">Button Text</Button>
            <Button size="sm">Button Text</Button>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="secondary" size="lg">
              Button Text
            </Button>
            <Button variant="secondary" size="md">
              Button Text
            </Button>
            <Button variant="secondary" size="sm">
              Button Text
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="tertiary" size="lg">
              Button Text
            </Button>
            <Button variant="tertiary" size="md">
              Button Text
            </Button>
            <Button variant="tertiary" size="sm">
              Button Text
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="rounded" size="lg">
              Button Text
            </Button>
            <Button variant="rounded" size="md">
              Button Text
            </Button>
            <Button variant="rounded" size="sm">
              Button Text
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <Button disabled size="lg">
              Button Text
            </Button>
            <Button disabled size="md">
              Button Text
            </Button>
            <Button disabled size="sm">
              Button Text
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <Button disabled variant="secondary" size="lg">
              Button Text
            </Button>
            <Button disabled variant="secondary" size="md">
              Button Text
            </Button>
            <Button disabled variant="secondary" size="sm">
              Button Text
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <Button disabled variant="tertiary" size="lg">
              Button Text
            </Button>
            <Button disabled variant="tertiary" size="md">
              Button Text
            </Button>
            <Button disabled variant="tertiary" size="sm">
              Button Text
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <Button disabled variant="rounded" size="lg">
              Button Text
            </Button>
            <Button disabled variant="rounded" size="md">
              Button Text
            </Button>
            <Button disabled variant="rounded" size="sm">
              Button Text
            </Button>
          </div>
        </div>
      </Section>
      <Section title="Avatar">
        <div className="p-4 mt-4 grid grid-cols-2 gap-4 w-fit">
          <Avatar />
          <Avatar username="Olivia Rhye" email="olivia@untitledui.com" />
          <Avatar image="https://picsum.photos/id/237/536/354" />
          <Avatar username="Olivia Rhye" email="olivia@untitledui.com" image="https://picsum.photos/id/237/536/354" />
        </div>
      </Section>
      <Section title="Typography">
        <Text variant="h1">H1</Text>
        <Text variant="h2">H2</Text>
        <Text variant="h3">H3</Text>
        <Text variant="h4">H4</Text>
        <Text variant="subtitle1">Subtitle 1</Text>
        <Text variant="subtitle2">Subtitle 2</Text>
        <Text variant="largeBody">Large Body</Text>
        <Text variant="body1">Body 1</Text>
        <Text variant="body2">Body 2</Text>
        <Text variant="caption">Caption</Text>
        <Text variant="small">Small</Text>
        <Text variant="btnLarge">Button Large</Text>
        <Text variant="btnMedium">Button Medium</Text>
        <Text variant="btnSmall">Button Small</Text>
      </Section>
      <Section title="Fonts">
        <p className="font-InterThin">Inter Thin</p>
        <p className="font-InterExtraLight">Inter ExtraLight</p>
        <p className="font-InterLight">Inter Light</p>
        <p className="font-InterRegular">Inter Regular</p>
        <p className="font-InterMedium">Inter Medium</p>
        <p className="font-InterSemiBold">Inter SemiBold</p>
        <p className="font-InterBold">Inter Bold</p>
        <p className="font-InterExtraBold">Inter ExtraBold</p>
        <p className="font-InterBlack">Inter Black</p>

        <hr className="my-4" />

        <p className="font-SpaceGroteskLight">SpaceGrotesk Light</p>
        <p className="font-SpaceGroteskRegular">SpaceGrotesk Regular</p>
        <p className="font-SpaceGroteskMedium">SpaceGrotesk Medium</p>
        <p className="font-SpaceGroteskSemiBold">SpaceGrotesk SemiBold</p>
        <p className="font-SpaceGroteskBold">SpaceGrotesk Bold</p>
      </Section>

      <Section title="Toast UI">
        <div className="grid grid-cols-2 gap-4 w-fit p-4">
          <Toast title="Toast Message" type="default" onDismiss={() => {}} />
          <Toast title="Toast Message" type="error" onDismiss={() => {}} />
          <Toast title="Toast Message" type="success" onDismiss={() => {}} />
          <Toast title="Toast Message" type="info" onDismiss={() => {}} />
        </div>
      </Section>

      <Section title="Toast Functional">
        <div className="gap-2 flex flex-row mt-4">
          <Button onClick={() => handleShowToast('success')}>showToast success</Button>
          <Button onClick={() => handleShowToast('error')}>showToast error</Button>
          <Button onClick={() => handleShowToast('info')}>showToast info</Button>
          <Button onClick={() => handleShowToast('default')}>showToast default</Button>
        </div>
      </Section>

      <Section title="Specialized Inputs">
        <SubSection title="Toggles">
          <div className="grid grid-cols-2">
            <div className="flex flex-col gap-4">
              <Text>Small</Text>
              <div className="flex gap-4">
                <Toggle size="sm" value={false} onToggle={() => {}} />
                <Toggle size="sm" value={true} onToggle={() => {}} />
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <Text>Medium</Text>
              <div className="flex gap-4">
                <Toggle size="md" value={false} onToggle={() => {}} />
                <Toggle size="md" value={true} onToggle={() => {}} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2">
            <div className="flex flex-col gap-4">
              <Text>Small with text</Text>
              <div className="flex gap-4">
                <Toggle size="sm" value={false} onToggle={() => {}} label="Remember me" />
                <Toggle size="sm" value={true} onToggle={() => {}} label="Remember me" />
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <Text>Medium with text</Text>
              <div className="flex gap-4">
                <Toggle size="md" value={false} onToggle={() => {}} label="Remember me" />
                <Toggle size="md" value={true} onToggle={() => {}} label="Remember me" />
              </div>
            </div>
          </div>
        </SubSection>

        <SubSection title="Checkbox">
          <div className="grid grid-cols-2 gap-4">
            {/* small */}
            <div className="flex flex-col gap-4">
              <Text>Small</Text>
              <div className="grid grid-cols-3 gap-4 w-fit">
                <Checkbox size="sm" onCheckedChange={() => {}} />
                <Checkbox size="sm" checked onCheckedChange={() => {}} />
                <Checkbox size="sm" indeterminate onCheckedChange={() => {}} />
                <Checkbox size="sm" disabled onCheckedChange={() => {}} />
                <Checkbox size="sm" disabled checked onCheckedChange={() => {}} />
                <Checkbox size="sm" disabled indeterminate onCheckedChange={() => {}} />
              </div>
            </div>

            {/* medium */}
            <div className="flex flex-col gap-4">
              <Text>Medium</Text>
              <div className="grid grid-cols-3 gap-4 w-fit">
                <Checkbox size="md" onCheckedChange={() => {}} />
                <Checkbox size="md" checked onCheckedChange={() => {}} />
                <Checkbox size="md" indeterminate onCheckedChange={() => {}} />
                <Checkbox size="md" disabled onCheckedChange={() => {}} />
                <Checkbox size="md" disabled checked onCheckedChange={() => {}} />
                <Checkbox size="md" disabled indeterminate onCheckedChange={() => {}} />
              </div>
            </div>

            {/* small with text */}
            <div className="flex flex-col gap-4">
              <Text>Small with text</Text>
              <div className="grid grid-cols-3 gap-4 w-fit">
                <Checkbox size="sm" label="Remember me" onCheckedChange={() => {}} />
                <Checkbox size="sm" label="Remember me" checked onCheckedChange={() => {}} />
                <Checkbox size="sm" label="Remember me" indeterminate onCheckedChange={() => {}} />
                <Checkbox size="sm" label="Remember me" disabled onCheckedChange={() => {}} />
                <Checkbox size="sm" label="Remember me" disabled checked onCheckedChange={() => {}} />
                <Checkbox size="sm" label="Remember me" disabled indeterminate onCheckedChange={() => {}} />
              </div>
            </div>

            {/* medium with text */}
            <div className="flex flex-col gap-4">
              <Text>Medium with text</Text>
              <div className="grid grid-cols-3 gap-4 w-fit">
                <Checkbox size="md" label="Remember me" onCheckedChange={() => {}} />
                <Checkbox size="md" label="Remember me" checked onCheckedChange={() => {}} />
                <Checkbox size="md" label="Remember me" indeterminate onCheckedChange={() => {}} />
                <Checkbox size="md" label="Remember me" disabled onCheckedChange={() => {}} />
                <Checkbox size="md" label="Remember me" disabled checked onCheckedChange={() => {}} />
                <Checkbox size="md" label="Remember me" disabled indeterminate onCheckedChange={() => {}} />
              </div>
            </div>
          </div>
        </SubSection>

        <SubSection title="Radio Button">
          <div className="grid grid-cols-2 gap-4">
            {/* small */}
            <div className="flex flex-col gap-4">
              <Text>Small</Text>
              <div className="grid grid-cols-2 gap-4 w-fit">
                <Radio size="sm" onCheckedChange={() => {}} />
                <Radio size="sm" checked onCheckedChange={() => {}} />
                <Radio size="sm" disabled onCheckedChange={() => {}} />
                <Radio size="sm" disabled checked onCheckedChange={() => {}} />
              </div>
            </div>

            {/* medium */}
            <div className="flex flex-col gap-4">
              <Text>Medium</Text>
              <div className="grid grid-cols-2 gap-4 w-fit">
                <Radio size="md" onCheckedChange={() => {}} />
                <Radio size="md" checked onCheckedChange={() => {}} />
                <Radio size="md" disabled onCheckedChange={() => {}} />
                <Radio size="md" disabled checked onCheckedChange={() => {}} />
              </div>
            </div>

            {/* small with text */}
            <div className="flex flex-col gap-4">
              <Text>Small with text</Text>
              <div className="grid grid-cols-2 gap-4 w-fit">
                <Radio size="sm" label="Remember me" onCheckedChange={() => {}} />
                <Radio size="sm" label="Remember me" checked onCheckedChange={() => {}} />
                <Radio size="sm" label="Remember me" disabled onCheckedChange={() => {}} />
                <Radio size="sm" label="Remember me" disabled checked onCheckedChange={() => {}} />
              </div>
            </div>

            {/* medium with text */}
            <div className="flex flex-col gap-4">
              <Text>Medium with text</Text>
              <div className="grid grid-cols-2 gap-4 w-fit">
                <Radio size="md" label="Remember me" onCheckedChange={() => {}} />
                <Radio size="md" label="Remember me" checked onCheckedChange={() => {}} />
                <Radio size="md" label="Remember me" disabled onCheckedChange={() => {}} />
                <Radio size="md" label="Remember me" disabled checked onCheckedChange={() => {}} />
              </div>
            </div>
          </div>
        </SubSection>
      </Section>

      <Section title="TextInput">
        <div className="grid grid-cols-4 gap-4">
          {/* first row */}
          <TextInput placeholder="olivia@untitledui.com" onChange={() => {}} disabled={false} />
          <TextInput placeholder="olivia@untitledui.com" onChange={() => {}} disabled={false} leftIcon="mail" />
          <TextInput
            placeholder="olivia@untitledui.com"
            onChange={() => {}}
            disabled={false}
            rightIcon="questionCircle"
          />
          <TextInput
            placeholder="olivia@untitledui.com"
            onChange={() => {}}
            disabled={false}
            leftIcon="mail"
            rightIcon="questionCircle"
          />

          {/* second row */}
          <TextInput label="Email" placeholder="olivia@untitledui.com" onChange={() => {}} disabled={false} />
          <TextInput
            label="Email"
            placeholder="olivia@untitledui.com"
            onChange={() => {}}
            disabled={false}
            leftIcon="mail"
          />
          <TextInput
            label="Email"
            placeholder="olivia@untitledui.com"
            onChange={() => {}}
            disabled={false}
            rightIcon="questionCircle"
          />
          <TextInput
            label="Email"
            placeholder="olivia@untitledui.com"
            onChange={() => {}}
            disabled={false}
            leftIcon="mail"
            rightIcon="questionCircle"
          />

          {/* third row */}
          <TextInput
            label="Email"
            placeholder="olivia@untitledui.com"
            onChange={() => {}}
            disabled={false}
            helperText="This is an helper message"
          />
          <TextInput
            label="Email"
            placeholder="olivia@untitledui.com"
            onChange={() => {}}
            disabled={false}
            leftIcon="mail"
            helperText="This is an helper message"
          />
          <TextInput
            label="Email"
            placeholder="olivia@untitledui.com"
            onChange={() => {}}
            disabled={false}
            rightIcon="questionCircle"
            helperText="This is an helper message"
          />
          <TextInput
            label="Email"
            placeholder="olivia@untitledui.com"
            onChange={() => {}}
            disabled={false}
            leftIcon="mail"
            rightIcon="questionCircle"
            helperText="This is an helper message"
          />

          {/* fourth row */}
          <TextInput
            label="Email"
            placeholder="olivia@untitledui.com"
            onChange={() => {}}
            disabled={false}
            helperText="This is an helper message"
            error="This is an error message"
            touched
          />
          <TextInput
            label="Email"
            placeholder="olivia@untitledui.com"
            onChange={() => {}}
            disabled={false}
            leftIcon="mail"
            helperText="This is an helper message"
            error="This is an error message"
            touched
          />
          <TextInput
            label="Email"
            placeholder="olivia@untitledui.com"
            onChange={() => {}}
            disabled={false}
            rightIcon="questionCircle"
            helperText="This is an helper message"
            error="This is an error message"
            touched
          />
          <TextInput
            label="Email"
            placeholder="olivia@untitledui.com"
            onChange={() => {}}
            disabled={false}
            leftIcon="mail"
            rightIcon="questionCircle"
            helperText="This is an helper message"
            error="This is an error message"
            touched
          />

          {/* fifth row */}
          <TextInput
            label="Email"
            placeholder="olivia@untitledui.com"
            onChange={() => {}}
            helperText="This is an helper message"
            error="This is an error message"
            disabled
            touched
          />
          <TextInput
            label="Email"
            placeholder="olivia@untitledui.com"
            onChange={() => {}}
            disabled
            leftIcon="mail"
            helperText="This is an helper message"
            error="This is an error message"
            touched
          />
          <TextInput
            label="Email"
            placeholder="olivia@untitledui.com"
            onChange={() => {}}
            disabled
            rightIcon="questionCircle"
            helperText="This is an helper message"
            error="This is an error message"
            touched
          />
          <TextInput
            label="Email"
            placeholder="olivia@untitledui.com"
            onChange={() => {}}
            disabled
            leftIcon="mail"
            rightIcon="questionCircle"
            helperText="This is an helper message"
            error="This is an error message"
            touched
          />

          {/* fifth row */}
          <TextInput
            label="Email"
            placeholder="olivia@untitledui.com"
            onChange={() => {}}
            helperText="This is an helper message"
            value="olivia@untitledui.com"
          />
          <TextInput
            label="Email"
            placeholder="olivia@untitledui.com"
            onChange={() => {}}
            leftIcon="mail"
            helperText="This is an helper message"
            value="olivia@untitledui.com"
          />
          <TextInput
            label="Email"
            placeholder="olivia@untitledui.com"
            onChange={() => {}}
            rightIcon="questionCircle"
            helperText="This is an helper message"
            value="olivia@untitledui.com"
          />
          <TextInput
            label="Email"
            placeholder="olivia@untitledui.com"
            onChange={() => {}}
            leftIcon="mail"
            rightIcon="questionCircle"
            helperText="This is an helper message"
            value="olivia@untitledui.com"
          />
        </div>
      </Section>

      <Section title="Text Area">
        <div className="grid grid-cols-3 gap-4">
          {/* first row */}
          <TextArea placeholder="Enter a description..." onChange={() => {}} />
          <TextArea placeholder="Enter a description..." onChange={() => {}} error="This is an error message" touched />
          <TextArea placeholder="Enter a description..." onChange={() => {}} disabled />

          {/* second row */}
          <TextArea label="Email" placeholder="Enter a description..." onChange={() => {}} />
          <TextArea
            label="Email"
            placeholder="Enter a description..."
            onChange={() => {}}
            error="This is an error message"
            touched
          />
          <TextArea label="Email" placeholder="Enter a description..." onChange={() => {}} disabled />

          {/* third row */}
          <TextArea
            label="Email"
            helperText="This is an helper message"
            placeholder="Enter a description..."
            onChange={() => {}}
          />
          <TextArea
            label="Email"
            error="This is an helper message"
            placeholder="Enter a description..."
            onChange={() => {}}
            touched
          />
          <TextArea
            label="Email"
            helperText="This is an helper message"
            placeholder="Enter a description..."
            onChange={() => {}}
            disabled
          />

          {/* fourth row */}
          <TextArea
            label="Email"
            value="A little about the company and the team that you’ll be working with."
            helperText="This is an helper message"
            placeholder="Enter a description..."
            onChange={() => {}}
          />
          <TextArea
            label="Email"
            value="A little about the company and the team that you’ll be working with."
            error="This is an helper message"
            placeholder="Enter a description..."
            onChange={() => {}}
            touched
          />
          <TextArea
            label="Email"
            value="A little about the company and the team that you’ll be working with."
            helperText="This is an helper message"
            placeholder="Enter a description..."
            onChange={() => {}}
            disabled
          />
        </div>
      </Section>
    </div>
  );
};

function SubSection({title, children}: any) {
  return (
    <>
      <Text variant="h2">{title}</Text>
      {children}
      <div className="h-4" />
    </>
  );
}

function Section({title, children}: any) {
  return (
    <>
      <Text variant="h1" className="mt-5">
        {title}
      </Text>
      <hr className="my-2" />
      {children}
      <div className="h-2" />
    </>
  );
}

function MultiSelectShowCase() {
  const options = [
    {id: 1, label: 'Option 1'},
    {id: 2, label: 'Option 2'},
    {id: 3, label: 'Option 3'},
  ];

  const [selectedValues, setSelectedValues] = React.useState<any[]>([]);
  return (
    <MultiSelectInput
      options={options}
      onChange={(items) => {
        const selectedValues = items.map(i => i.id)
        setSelectedValues(selectedValues)
      }}
      values={selectedValues}
      placeholder="Select an option"
      label="Select an option"
      error="This is an error message"
      touched
      usePortal
      className="max-w-75"
    />
  );
}
