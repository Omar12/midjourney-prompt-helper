import { Dialog } from '@base-ui/react/dialog'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KeyInput } from './KeyInput'

export function SettingsModal() {
  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button variant="ghost" size="icon" aria-label="Settings" />}>
        <Settings className="size-4" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-popover p-6 text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
          <div className="flex flex-col gap-4">
            <Dialog.Title className="font-heading text-base font-medium">
              API Settings
            </Dialog.Title>
            <KeyInput />
            <p className="text-sm text-muted-foreground">
              Your API key is stored locally in your browser and sent only to your chosen provider — there is no first-party server.
            </p>
            <div className="flex justify-end">
              <Dialog.Close render={<Button variant="outline" />}>
                Close
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
