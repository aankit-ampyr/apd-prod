import {Text, Button, Icon} from '@/ui-kits';
import {IconTypes} from '@lazarus/react-common';
import {Images} from '@/assets/images';

interface PDFInvoiceEmptyStateProps {
  onUpload?: () => void;
}
export function PDFInvoiceEmptyState(props: PDFInvoiceEmptyStateProps) {
  const {onUpload} = props;

  /**
   * ==============================
   * States & Constants
   * ==============================
   */
  const nextSteps: Array<{
    icon: IconTypes;
    text: string;
  }> = [
    {
      icon: 'file-search',
      text: 'Key information such as invoice number, date and amount will be extracted.',
    },
    {
      icon: 'tag',
      text: 'Uploaded invoices will be automatically classified by type.',
    },
    {
      icon: 'eye',
      text: 'Extraction quality and PDFs will be available for review.',
    },
  ];

  return (
    <div className="flex items-center flex-col">
      <img src={Images.pdfInvoices} />
      <div className="flex items-center flex-col gap-4">
        <Text variant="h3">No PDF invoices uploaded yet</Text>
        <Text variant="14R" className="text-center text-text-secondary!">
          Upload PDF invoices to automatically extract invoice number, invoice date and amount, classify
          <br />
          invoices by type, and review the extracted information.
        </Text>
        <Button text="Upload PDF Invoices" leftIcon="upload-2" className="mt-2" onClick={onUpload} />
        <span className="flex gap-1 items-center">
          <Icon name="supported-document" />
          <Text variant="14R" className="text-center text-text-secondary!">
            Supported format : PDF · Multiple files can be uploaded at once
          </Text>
        </span>
      </div>
      {/* <IconDisplay /> */}

      <div className="border-[#A3E9E1] border mt-10 mb-8 bg-white px-6 py-4 gap-1 flex flex-col rounded-md">
        <Text variant="14SB" className="text-text-secondary!">
          What Happens Next
        </Text>
        {nextSteps.map((step, index) => (
          <span key={index} className="flex gap-2 items-center mt-2">
            <div className="bg-[#E4FFFD] size-8 rounded-full flex items-center justify-center">
              <Icon name={step.icon} className="text-[#1B988B]" />
            </div>
            <Text variant="14M" className="text-text-secondary!">
              {step.text}
            </Text>
          </span>
        ))}
      </div>
    </div>
  );
}
