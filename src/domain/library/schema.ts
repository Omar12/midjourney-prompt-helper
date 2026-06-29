import { z } from 'zod'
import { PromptDraftSchema } from '@/domain/prompt/model'

// Extend PromptDraftSchema with the display name field.
// PromptDraftSchema already covers id, intent, chips, flags, schemaVersion,
// selectedVersionId, createdAt, updatedAt.
// LibraryEntrySchema is used for: (a) the Dexie EntityTable type, (b) import validation.
export const LibraryEntrySchema = PromptDraftSchema.extend({
  name: z.string().min(1), // mutable display name; non-empty enforced
})

export type LibraryEntry = z.infer<typeof LibraryEntrySchema>
