import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useDataStore = defineStore('data', () => {
    const fastaData = ref([])
    const csvData = ref([])

    const isFastaLoaded = computed(() => fastaData.value.length > 0)
    const isCsvLoaded = computed(() => csvData.value.length > 0)

    return {
        fastaData,
        csvData,
        isFastaLoaded,
        isCsvLoaded
    }
})
