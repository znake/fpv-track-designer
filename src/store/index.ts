import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createConfigSlice, type ConfigSlice } from './configSlice'
import { createTrackSlice, type TrackSlice } from './trackSlice'

type AppState = ConfigSlice & TrackSlice

export const useAppStore = create<AppState>()(
  devtools((set, get, store) => ({
    ...createConfigSlice(set, get, store),
    ...createTrackSlice(set, get, store),
  }))
)
