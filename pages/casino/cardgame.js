// pages/casino/cardgame.js
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useCart } from '@/context/CartContext'
import { FaCoins, FaUsers, FaPlay, FaTimes, FaCheck, FaWifi } from 'react-icons/fa'
import { toast } from 'react-hot-toast'
import { auth, db } from '@/lib/firebase'
import ConfirmationModal from '@/components/ConfirmationModal'
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  orderBy,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore'
import io from 'socket.io-client'

// Card values in order (3 is smallest, 2 is biggest)
const CARD_VALUES = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']
const CARD_SUITS = ['♠', '♥', '♦', '♣']

// Create a deck of cards
const createDeck = (numDecks = 1) => {
  const deck = []
  for (let d = 0; d < numDecks; d++) {
    for (const suit of CARD_SUITS) {
      for (const value of CARD_VALUES) {
        deck.push({ suit, value, id: `${value}${suit}${d}` })
      }
    }
    // Add jokers
    deck.push({ suit: '🃏', value: 'JOKER', id: `JOKER1${d}` })
    deck.push({ suit: '🃏', value: 'JOKER', id: `JOKER2${d}` })
  }
  return deck
}

// Shuffle deck
const shuffleDeck = (deck) => {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Deal cards to players
const dealCards = (deck, numPlayers) => {
  const hands = Array(numPlayers).fill().map(() => [])
  const cardsPerPlayer = Math.floor(deck.length / numPlayers)
  
  for (let i = 0; i < deck.length; i++) {
    const playerIndex = i % numPlayers
    if (hands[playerIndex].length < cardsPerPlayer) {
      hands[playerIndex].push(deck[i])
    }
  }
  
  // Sort each hand by card value
  hands.forEach(hand => {
    hand.sort((a, b) => {
      const indexA = CARD_VALUES.indexOf(a.value)
      const indexB = CARD_VALUES.indexOf(b.value)
      return indexA - indexB
    })
  })
  
  return hands
}

// Check if a combination is valid
const isValidCombination = (cards) => {
  if (!cards || cards.length === 0) return false
  
  // Single card
  if (cards.length === 1) return true
  
  // Double
  if (cards.length === 2) {
    // Both cards must be the same value, or one must be a joker (but not both jokers)
    return cards[0].value === cards[1].value || 
           (cards[0].value === 'JOKER' && cards[1].value !== 'JOKER') ||
           (cards[1].value === 'JOKER' && cards[0].value !== 'JOKER')
  }
  
  // Triplet
  if (cards.length === 3) {
    const values = cards.map(card => card.value).filter(v => v !== 'JOKER')
    const jokers = cards.filter(card => card.value === 'JOKER').length
    return values.length === 0 || 
           (values.length === 1 && jokers === 2) ||
           (values.length === 2 && jokers === 1 && values[0] === values[1]) ||
           (values.length === 3 && values[0] === values[1] && values[1] === values[2])
  }
  
  // Bomb (4 of a kind)
  if (cards.length === 4) {
    const values = cards.map(card => card.value).filter(v => v !== 'JOKER')
    const jokers = cards.filter(card => card.value === 'JOKER').length
    const isValid = values.length === 0 || 
           (values.length === 1 && jokers === 3) ||
           (values.length === 2 && jokers === 2 && values[0] === values[1]) ||
           (values.length === 3 && jokers === 1 && values[0] === values[1] && values[1] === values[2]) ||
           (values.length === 4 && values[0] === values[1] && values[1] === values[2] && values[2] === values[3])
    if (isValid) return true
    
    // If not a bomb, check if it's consecutive doubles
    return isConsecutiveDoubles(cards)
  }
  
  // 5-Bomb (5 of a kind)
  if (cards.length === 5) {
    const values = cards.map(card => card.value).filter(v => v !== 'JOKER')
    const jokers = cards.filter(card => card.value === 'JOKER').length
    return values.length === 0 || 
           (values.length === 1 && jokers === 4) ||
           (values.length === 2 && jokers === 3 && values[0] === values[1]) ||
           (values.length === 3 && jokers === 2 && values[0] === values[1] && values[1] === values[2]) ||
           (values.length === 4 && jokers === 1 && values[0] === values[1] && values[1] === values[2] && values[2] === values[3]) ||
           (values.length === 5 && values[0] === values[1] && values[1] === values[2] && values[2] === values[3] && values[3] === values[4])
  }
  
  // 6-Bomb (6 of a kind)
  if (cards.length === 6) {
    const values = cards.map(card => card.value).filter(v => v !== 'JOKER')
    const jokers = cards.filter(card => card.value === 'JOKER').length
    const isValid = values.length === 0 || 
           (values.length === 1 && jokers === 5) ||
           (values.length === 2 && jokers === 4 && values[0] === values[1]) ||
           (values.length === 3 && jokers === 3 && values[0] === values[1] && values[1] === values[2]) ||
           (values.length === 4 && jokers === 2 && values[0] === values[1] && values[1] === values[2] && values[2] === values[3]) ||
           (values.length === 5 && jokers === 1 && values[0] === values[1] && values[1] === values[2] && values[2] === values[3] && values[3] === values[4]) ||
           (values.length === 6 && values[0] === values[1] && values[1] === values[2] && values[2] === values[3] && values[3] === values[4] && values[4] === values[5])
    if (isValid) return true
    
    // If not a bomb, check if it's consecutive doubles
    return isConsecutiveDoubles(cards)
  }
  
  // Sequences (minimum 5 cards, 2 cannot be included)
  if (cards.length >= 5) {
    // For sequences, all non-joker values must be unique (except for jokers)
    const nonJokerValues = cards.map(card => card.value).filter(v => v !== 'JOKER')
    const uniqueValues = [...new Set(nonJokerValues)]
    
    // If we have duplicates of the same value, it's not a valid sequence
    if (uniqueValues.length !== nonJokerValues.length) {
      // Check if it's a valid non-sequence combination
      if (isConsecutiveDoubles(cards)) return true
      if (isTripletSequence(cards)) return true
      if (isCoupledBombs(cards)) return true
      if (isConsecutiveBombs(cards)) return true
      return false
    }
    
    // Check if it's a sequence
    if (isSequence(cards)) return true
    
    // Check if it's consecutive doubles
    if (isConsecutiveDoubles(cards)) return true
    
    // Check if it's triplet sequences
    if (isTripletSequence(cards)) return true
    
    // Check if it's coupled bombs (two bombs together)
    if (isCoupledBombs(cards)) return true
    
    // Check if it's consecutive bombs (two consecutive bombs)
    if (isConsecutiveBombs(cards)) return true
  }
  
  return false
}

// Helper function to check if cards form a sequence (5+ consecutive cards, no 2s)
const isSequence = (cards) => {
  if (cards.length < 5) return false
  
  const values = cards.map(card => card.value).filter(v => v !== 'JOKER' && v !== '2')
  const jokers = cards.filter(card => card.value === 'JOKER').length
  
  if (values.length + jokers < 5) return false
  
  // Remove duplicates and sort values
  const uniqueValues = [...new Set(values)].sort((a, b) => CARD_VALUES.indexOf(a) - CARD_VALUES.indexOf(b))
  
  // Check if the unique values form a consecutive sequence
  if (uniqueValues.length >= 5) {
    // Check if the unique values form a consecutive sequence
    for (let i = 0; i < uniqueValues.length - 4; i++) {
      let consecutive = true
      for (let j = 0; j < 4; j++) {
        const currentIndex = CARD_VALUES.indexOf(uniqueValues[i + j])
        const nextIndex = CARD_VALUES.indexOf(uniqueValues[i + j + 1])
        if (nextIndex !== currentIndex + 1) {
          consecutive = false
          break
        }
      }
      if (consecutive) return true
    }
  }
  
  // If we don't have enough unique values, check if jokers can help form a sequence
  if (uniqueValues.length + jokers >= 5) {
    // Try to form a sequence using jokers to fill gaps
    for (let start = 0; start < uniqueValues.length; start++) {
      let sequence = [uniqueValues[start]]
      let jokersUsed = 0
      
      for (let i = 1; i < 5; i++) {
        const expectedValue = CARD_VALUES[CARD_VALUES.indexOf(uniqueValues[start]) + i]
        if (expectedValue && expectedValue !== '2') {
          if (uniqueValues.includes(expectedValue)) {
            sequence.push(expectedValue)
          } else if (jokersUsed < jokers) {
            sequence.push(expectedValue)
            jokersUsed++
          } else {
            break
          }
        }
      }
      
      if (sequence.length >= 5) {
        return true
      }
    }
  }
  
  return false
}

// Helper function to check if cards form consecutive doubles
const isConsecutiveDoubles = (cards) => {
  if (cards.length < 4 || cards.length % 2 !== 0) {
    return false
  }
  
  const valueCounts = {}
  const jokers = cards.filter(card => card.value === 'JOKER')
  
  cards.forEach(card => {
    if (card.value !== 'JOKER') {
      valueCounts[card.value] = (valueCounts[card.value] || 0) + 1
    }
  })
  
  const doubleValues = Object.keys(valueCounts).filter(value => valueCounts[value] >= 2)
  doubleValues.sort((a, b) => CARD_VALUES.indexOf(a) - CARD_VALUES.indexOf(b))
  
  // We need at least 2 pairs (either from actual doubles or jokers)
  const actualPairs = doubleValues.length
  const jokerPairs = Math.floor(jokers.length / 2)
  const totalPairs = actualPairs + jokerPairs
  
  if (totalPairs < 2) {
    return false
  }
  
  // If we have actual double values, they must be consecutive
  if (doubleValues.length >= 2) {
    for (let i = 0; i < doubleValues.length - 1; i++) {
      const currentIndex = CARD_VALUES.indexOf(doubleValues[i])
      const nextIndex = CARD_VALUES.indexOf(doubleValues[i + 1])
      if (nextIndex !== currentIndex + 1) {
        return false
      }
    }
  }
  
  return true
}

// Helper function to check if cards form triplet sequences
const isTripletSequence = (cards) => {
  if (cards.length < 6 || cards.length % 3 !== 0) return false
  
  const valueCounts = {}
  const jokers = cards.filter(card => card.value === 'JOKER')
  
  cards.forEach(card => {
    if (card.value !== 'JOKER') {
      valueCounts[card.value] = (valueCounts[card.value] || 0) + 1
    }
  })
  
  const tripletValues = Object.keys(valueCounts).filter(value => valueCounts[value] >= 3)
  tripletValues.sort((a, b) => CARD_VALUES.indexOf(a) - CARD_VALUES.indexOf(b))
  
  for (let i = 0; i < tripletValues.length - 1; i++) {
    const currentIndex = CARD_VALUES.indexOf(tripletValues[i])
    const nextIndex = CARD_VALUES.indexOf(tripletValues[i + 1])
    if (nextIndex !== currentIndex + 1) return false
  }
  
  const totalTriplets = tripletValues.length + Math.floor(jokers.length / 3)
  return totalTriplets >= 2
}

// Helper function to check if cards form coupled bombs
const isCoupledBombs = (cards) => {
  if (cards.length !== 8) return false
  
  const group1 = cards.slice(0, 4)
  const group2 = cards.slice(4, 8)
  
  return isValidCombination(group1) && isValidCombination(group2)
}

// Helper function to check if cards form consecutive bombs
const isConsecutiveBombs = (cards) => {
  if (cards.length !== 8) return false
  
  const group1 = cards.slice(0, 4)
  const group2 = cards.slice(4, 8)
  
  if (!isValidCombination(group1) || !isValidCombination(group2)) return false
  
  const value1 = getBombValue(group1)
  const value2 = getBombValue(group2)
  
  if (!value1 || !value2) return false
  
  const index1 = CARD_VALUES.indexOf(value1)
  const index2 = CARD_VALUES.indexOf(value2)
  
  return Math.abs(index1 - index2) === 1
}

// Helper function to get bomb value without circular dependency
const getBombValue = (cards) => {
  if (!cards || cards.length === 0) return null
  
  const values = cards.map(card => card.value).filter(v => v !== 'JOKER')
  const jokers = cards.filter(card => card.value === 'JOKER').length
  
  if (values.length === 0) return '2'
  
  // For 4-card bombs
  if (cards.length === 4) {
    if (jokers === 3 && values.length === 1) return values[0]
    if (jokers === 2 && values.length === 2 && values[0] === values[1]) return values[0]
    if (jokers === 1 && values.length === 3 && values[0] === values[1] && values[1] === values[2]) return values[0]
    if (values.length === 4 && values[0] === values[1] && values[1] === values[2] && values[2] === values[3]) return values[0]
  }
  
  // For 5-card bombs
  if (cards.length === 5) {
    if (jokers === 4 && values.length === 1) return values[0]
    if (jokers === 3 && values.length === 2 && values[0] === values[1]) return values[0]
    if (jokers === 2 && values.length === 3 && values[0] === values[1] && values[1] === values[2]) return values[0]
    if (jokers === 1 && values.length === 4 && values[0] === values[1] && values[1] === values[2] && values[2] === values[3]) return values[0]
    if (values.length === 5 && values[0] === values[1] && values[1] === values[2] && values[2] === values[3] && values[3] === values[4]) return values[0]
  }
  
  // For 6-card bombs
  if (cards.length === 6) {
    if (jokers === 5 && values.length === 1) return values[0]
    if (jokers === 4 && values.length === 2 && values[0] === values[1]) return values[0]
    if (jokers === 3 && values.length === 3 && values[0] === values[1] && values[1] === values[2]) return values[0]
    if (jokers === 2 && values.length === 4 && values[0] === values[1] && values[1] === values[2] && values[2] === values[3]) return values[0]
    if (jokers === 1 && values.length === 5 && values[0] === values[1] && values[1] === values[2] && values[2] === values[3] && values[3] === values[4]) return values[0]
    if (values.length === 6 && values[0] === values[1] && values[1] === values[2] && values[2] === values[3] && values[3] === values[4] && values[4] === values[5]) return values[0]
  }
  
  return values[0] || '2'
}

// Efficient combination value calculation - consolidated logic
const getCombinationValue = (cards) => {
  if (!cards || cards.length === 0) return null
  
  const values = cards.map(card => card.value).filter(v => v !== 'JOKER')
  const jokers = cards.filter(card => card.value === 'JOKER').length
  
  if (values.length === 0) return '2'
  
  // Singles
  if (cards.length === 1) {
    return cards[0].value === 'JOKER' ? '2' : cards[0].value
  }
  
  // Doubles
  if (cards.length === 2) {
    if (jokers === 1 && values.length === 1) return values[0]
    if (values.length === 2 && values[0] === values[1]) return values[0]
  }
  
  // Triplets
  if (cards.length === 3) {
    if (jokers === 2 && values.length === 1) return values[0]
    if (jokers === 1 && values.length === 2 && values[0] === values[1]) return values[0]
    if (values.length === 3 && values[0] === values[1] && values[1] === values[2]) return values[0]
  }
  
  // Bombs (4, 5, 6 cards)
  if (cards.length >= 4 && cards.length <= 6) {
    const bombValue = getBombValue(cards)
    if (bombValue) return bombValue
  }
  
  // Sequences (5+ cards)
  if (cards.length >= 5) {
    if (isSequence(cards)) {
      const sortedValues = values.sort((a, b) => CARD_VALUES.indexOf(a) - CARD_VALUES.indexOf(b))
      return sortedValues[sortedValues.length - 1]
    }
    
    if (isConsecutiveDoubles(cards)) {
      const valueCounts = {}
      cards.forEach(card => {
        if (card.value !== 'JOKER') {
          valueCounts[card.value] = (valueCounts[card.value] || 0) + 1
        }
      })
      const doubleValues = Object.keys(valueCounts).filter(value => valueCounts[value] >= 2)
      const sortedDoubleValues = doubleValues.sort((a, b) => CARD_VALUES.indexOf(a) - CARD_VALUES.indexOf(b))
      return sortedDoubleValues[sortedDoubleValues.length - 1]
    }
    
    if (isTripletSequence(cards)) {
      const valueCounts = {}
      cards.forEach(card => {
        if (card.value !== 'JOKER') {
          valueCounts[card.value] = (valueCounts[card.value] || 0) + 1
        }
      })
      const tripletValues = Object.keys(valueCounts).filter(value => valueCounts[value] >= 3)
      const sortedTripletValues = tripletValues.sort((a, b) => CARD_VALUES.indexOf(a) - CARD_VALUES.indexOf(b))
      return sortedTripletValues[sortedTripletValues.length - 1]
    }
    
    if (isCoupledBombs(cards) || isConsecutiveBombs(cards)) {
      const group1 = cards.slice(0, 4)
      const group2 = cards.slice(4, 8)
      const value1 = getBombValue(group1)
      const value2 = getBombValue(group2)
      const index1 = CARD_VALUES.indexOf(value1)
      const index2 = CARD_VALUES.indexOf(value2)
      return index1 > index2 ? value1 : value2
    }
  }
  
  return values[0] || '2'
}

// Efficient canBeat function - simplified logic
const canBeat = (cardsA, cardsB) => {
  if (!isValidCombination(cardsA) || !isValidCombination(cardsB)) return false
  
  // Check if either combination is a consecutive bomb (8 cards)
  const isConsecutiveBombA = cardsA.length === 8 && isConsecutiveBombs(cardsA)
  const isConsecutiveBombB = cardsB.length === 8 && isConsecutiveBombs(cardsB)
  
  // Consecutive bombs beat any single bomb
  if (isConsecutiveBombA && !isConsecutiveBombB) return true
  if (!isConsecutiveBombA && isConsecutiveBombB) return false
  
  // If both are consecutive bombs, compare their values
  if (isConsecutiveBombA && isConsecutiveBombB) {
    const valueA = getCombinationValue(cardsA)
    const valueB = getCombinationValue(cardsB)
    if (!valueA || !valueB) return false
    const indexA = CARD_VALUES.indexOf(valueA)
    const indexB = CARD_VALUES.indexOf(valueB)
    return indexA > indexB
  }
  
  // Check if either combination is a coupled bomb (8 cards)
  const isCoupledBombA = cardsA.length === 8 && isCoupledBombs(cardsA)
  const isCoupledBombB = cardsB.length === 8 && isCoupledBombs(cardsB)
  
  // Coupled bombs beat any single bomb
  if (isCoupledBombA && !isCoupledBombB) return true
  if (!isCoupledBombA && isCoupledBombB) return false
  
  // If both are coupled bombs, compare their values
  if (isCoupledBombA && isCoupledBombB) {
    const valueA = getCombinationValue(cardsA)
    const valueB = getCombinationValue(cardsB)
    if (!valueA || !valueB) return false
    const indexA = CARD_VALUES.indexOf(valueA)
    const indexB = CARD_VALUES.indexOf(valueB)
    return indexA > indexB
  }
  
  // Single bomb hierarchy (6 > 5 > 4)
  const getSingleBombRank = (cards) => {
    if (cards.length === 6 && isValidCombination(cards)) return 6
    if (cards.length === 5 && isValidCombination(cards)) return 5
    if (cards.length === 4 && isValidCombination(cards)) return 4
    return 0
  }
  
  const bombRankA = getSingleBombRank(cardsA)
  const bombRankB = getSingleBombRank(cardsB)
  
  if (bombRankA > 0 && bombRankB === 0) return true
  if (bombRankB > 0 && bombRankA === 0) return false
  if (bombRankA > 0 && bombRankB > 0) {
    if (bombRankA > bombRankB) return true
    if (bombRankB > bombRankA) return false
  }
  
  // Same type check
  if (!isSameType(cardsA, cardsB)) return false
  
  // Value comparison
  const valueA = getCombinationValue(cardsA)
  const valueB = getCombinationValue(cardsB)
  
  if (!valueA || !valueB) return false
  
  const indexA = CARD_VALUES.indexOf(valueA)
  const indexB = CARD_VALUES.indexOf(valueB)
  
  return indexA > indexB
}

// Efficient same type check
const isSameType = (cardsA, cardsB) => {
  if (cardsA.length !== cardsB.length) return false
  
  // Simple length-based types (singles, doubles, triplets, single bombs)
  if (cardsA.length <= 6) return true
  
  // Complex types (5+ cards)
  if (cardsA.length >= 5) {
    if (isSequence(cardsA) && isSequence(cardsB)) return true
    if (isConsecutiveDoubles(cardsA) && isConsecutiveDoubles(cardsB)) return true
    if (isTripletSequence(cardsA) && isTripletSequence(cardsB)) return true
  }
  
  // 8-card combinations (coupled bombs and consecutive bombs)
  if (cardsA.length === 8) {
    if (isCoupledBombs(cardsA) && isCoupledBombs(cardsB)) return true
    if (isConsecutiveBombs(cardsA) && isConsecutiveBombs(cardsB)) return true
  }
  
  return false
}

// CPU player names
const CPU_NAMES = ['bobbybuoy', 'jerfeen', 'butter', 'sang', 'vivibot', 'alsiebot']

// Efficient combination finder - simplified and optimized
const findValidCombinations = (hand) => {
  const combinations = []
  
  // Singles
  hand.forEach(card => combinations.push([card]))
  
  // Doubles
  for (let i = 0; i < hand.length - 1; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      if (hand[i].value === hand[j].value || 
          (hand[i].value === 'JOKER' && hand[j].value !== 'JOKER') ||
          (hand[j].value === 'JOKER' && hand[i].value !== 'JOKER')) {
        combinations.push([hand[i], hand[j]])
      }
    }
  }
  
  // Triplets
  for (let i = 0; i < hand.length - 2; i++) {
    for (let j = i + 1; j < hand.length - 1; j++) {
      for (let k = j + 1; k < hand.length; k++) {
        const cards = [hand[i], hand[j], hand[k]]
        if (isValidCombination(cards)) {
          combinations.push(cards)
        }
      }
    }
  }
  
  // Bombs (4, 5, 6 of a kind)
  for (let size = 4; size <= 6 && size <= hand.length; size++) {
    const generateBombs = (arr, size, start = 0, current = []) => {
      if (current.length === size) {
        const combination = [...current]
        if (isValidCombination(combination)) {
          combinations.push(combination)
        }
        return
      }
      
      for (let i = start; i < arr.length; i++) {
        current.push(arr[i])
        generateBombs(arr, size, i + 1, current)
        current.pop()
      }
    }
    
    generateBombs(hand, size)
  }
  
  // Sequences and complex combinations (5+ cards) - limited to prevent performance issues
  if (hand.length >= 5) {
    // Only generate combinations up to 8 cards to prevent explosion
    const maxSize = Math.min(8, hand.length)
    for (let size = 5; size <= maxSize; size++) {
      const generateCombinations = (arr, size, start = 0, current = []) => {
        if (current.length === size) {
          const combination = [...current]
          if (isValidCombination(combination)) {
            combinations.push(combination)
          }
          return
        }
        
        for (let i = start; i < arr.length; i++) {
          current.push(arr[i])
          generateCombinations(arr, size, i + 1, current)
          current.pop()
        }
      }
      
      generateCombinations(hand, size)
    }
  }
  
  return combinations
}

// Helper function to get combination type
const getCombinationType = (cards) => {
  if (!cards || cards.length === 0) return 'invalid'
  
  if (cards.length === 1) return 'single'
  if (cards.length === 2) return 'double'
  if (cards.length === 3) return 'triplet'
  
  // Check for bombs first
  if (cards.length === 4) {
    const values = cards.map(card => card.value).filter(v => v !== 'JOKER')
    const jokers = cards.filter(card => card.value === 'JOKER').length
    const isValid = values.length === 0 || 
           (values.length === 1 && jokers === 3) ||
           (values.length === 2 && jokers === 2 && values[0] === values[1]) ||
           (values.length === 3 && jokers === 1 && values[0] === values[1] && values[1] === values[2]) ||
           (values.length === 4 && values[0] === values[1] && values[1] === values[2] && values[2] === values[3])
    if (isValid) return 'bomb_4'
  }
  
  if (cards.length === 5) {
    const values = cards.map(card => card.value).filter(v => v !== 'JOKER')
    const jokers = cards.filter(card => card.value === 'JOKER').length
    const isValid = values.length === 0 || 
           (values.length === 1 && jokers === 4) ||
           (values.length === 2 && jokers === 3 && values[0] === values[1]) ||
           (values.length === 3 && jokers === 2 && values[0] === values[1] && values[1] === values[2]) ||
           (values.length === 4 && jokers === 1 && values[0] === values[1] && values[1] === values[2] && values[2] === values[3]) ||
           (values.length === 5 && values[0] === values[1] && values[1] === values[2] && values[2] === values[3] && values[3] === values[4])
    if (isValid) return 'bomb_5'
  }
  
  if (cards.length === 6) {
    const values = cards.map(card => card.value).filter(v => v !== 'JOKER')
    const jokers = cards.filter(card => card.value === 'JOKER').length
    const isValid = values.length === 0 || 
           (values.length === 1 && jokers === 5) ||
           (values.length === 2 && jokers === 4 && values[0] === values[1]) ||
           (values.length === 3 && jokers === 3 && values[0] === values[1] && values[1] === values[2]) ||
           (values.length === 4 && jokers === 2 && values[0] === values[1] && values[1] === values[2] && values[2] === values[3]) ||
           (values.length === 5 && jokers === 1 && values[0] === values[1] && values[1] === values[2] && values[2] === values[3] && values[3] === values[4]) ||
           (values.length === 6 && values[0] === values[1] && values[1] === values[2] && values[2] === values[3] && values[3] === values[4] && values[4] === values[5])
    if (isValid) return 'bomb_6'
  }
  
  // Check for sequences
  if (isSequence(cards)) return 'sequence'
  
  // Check for consecutive doubles
  if (isConsecutiveDoubles(cards)) return 'consecutive_doubles'
  
  // Check for triplet sequences
  if (isTripletSequence(cards)) return 'triplet_sequence'
  
  // Check for coupled bombs
  if (isCoupledBombs(cards)) return 'coupled_bombs'
  
  // Check for consecutive bombs
  if (isConsecutiveBombs(cards)) return 'consecutive_bombs'
  
  return 'invalid'
}

export default function CardGame() {
  const { pounds, updatePounds } = useCart()
  const [gameState, setGameState] = useState('lobby') // lobby, waiting, playing, finished
  const [players, setPlayers] = useState([])
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [myHand, setMyHand] = useState([])
  const [selectedCards, setSelectedCards] = useState([])
  const [lastPlay, setLastPlay] = useState(null)
  const [passedPlayers, setPassedPlayers] = useState([]) // Track who has passed on current play
  const [gameId, setGameId] = useState(null)
  const [socket, setSocket] = useState(null)
  const [betAmount, setBetAmount] = useState(1)
  const [mounted, setMounted] = useState(false)
  const [isMyTurn, setIsMyTurn] = useState(false)
  const [winner, setWinner] = useState(null)
  const [gameHistory, setGameHistory] = useState([])
  const [availableGames, setAvailableGames] = useState([])
  const [joinGameId, setJoinGameId] = useState('')
  const [betDeducted, setBetDeducted] = useState(false)
  const [onlinePlayers, setOnlinePlayers] = useState(0)
  
  // Practice mode state
  const [isPracticeMode, setIsPracticeMode] = useState(false)
  const [cpuPlayers, setCpuPlayers] = useState([])
  const [cpuThinking, setCpuThinking] = useState(false)
  
  // Confirmation modal state
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false)
  const [pendingLeaveAction, setPendingLeaveAction] = useState(null)
  
     // New state for shuffling and dealing animations
   const [isShuffling, setIsShuffling] = useState(false)
   const [isDealing, setIsDealing] = useState(false)
   const [dealtCards, setDealtCards] = useState([])
   
   // Debug useEffect to monitor state changes
   useEffect(() => {
     if (gameState === 'playing') {
       console.log('=== STATE DEBUG ===')
       console.log('Players:', players.map(p => ({ id: p.id, name: p.name, handLength: p.hand?.length || 0, isCpu: p.isCpu })))
       console.log('My hand length:', myHand.length)
       console.log('Current player:', currentPlayer)
       console.log('Is my turn:', isMyTurn)
       console.log('Last play:', lastPlay)
       console.log('CPU thinking:', cpuThinking)
       console.log('==================')
     }
   }, [players, myHand, currentPlayer, isMyTurn, lastPlay, cpuThinking, gameState])

  const user = auth.currentUser

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!user) return

    // Initialize socket connection
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://bebe-anniversary-production.up.railway.app'  // Railway deployment URL
        : 'http://localhost:3001')
    
    console.log('Connecting to Socket.IO server:', socketUrl)
    
    const newSocket = io(socketUrl, {
      auth: {
        userId: user.uid,
        displayName: user.displayName || user.email
      },
      transports: ['websocket', 'polling'] // Add fallback transport
    })

    newSocket.on('connect', () => {
      console.log('Connected to game server')
    })

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      toast.error('Failed to connect to game server')
    })

    newSocket.on('gameUpdate', (data) => {
      handleGameUpdate(data)
    })

    newSocket.on('playerJoined', (data) => {
      toast.success(`${data.playerName} joined the game!`)
    })

    newSocket.on('playerLeft', (data) => {
      toast.error(`${data.playerName} left the game`)
    })

    // Listen for online player count updates
    newSocket.on('onlinePlayersUpdate', (data) => {
      console.log('Online players update:', data.count)
      setOnlinePlayers(data.count)
    })

    // Request current online player count
    newSocket.emit('getOnlinePlayers')

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [user])

  // Cleanup function to handle bet refunds when component unmounts
  useEffect(() => {
    return () => {
      // If user leaves while game is in progress and bet was deducted, refund it
      if (gameState === 'playing' && betDeducted && gameId && user) {
        // This will be handled by the leaveGame function if called properly
        // But as a safety measure, we can also handle it here
        console.log('Component unmounting - ensuring bet refund if needed')
      }
    }
  }, [gameState, betDeducted, gameId, user])

  // Listen for available games
  useEffect(() => {
    if (!user) return

    const gamesQuery = query(
      collection(db, 'cardGames'),
      where('gameState', '==', 'waiting'),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(gamesQuery, (snapshot) => {
      const games = []
      snapshot.forEach((doc) => {
        const gameData = doc.data()
        // Only show games that aren't full and don't include the current user
        if (gameData.players.length < 4 && 
            !gameData.players.some(p => p.id === user.uid)) {
          games.push({
            id: doc.id,
            ...gameData
          })
        }
      })
      setAvailableGames(games)
    })

    return () => unsubscribe()
  }, [user])

  const handleGameUpdate = (data) => {
    setGameState(data.gameState)
    setPlayers(data.players)
    setCurrentPlayer(data.currentPlayer)
    setLastPlay(data.lastPlay)
    setWinner(data.winner)
    
    // Reset bet deduction flag when game state changes
    if (data.gameState === 'waiting') {
      setBetDeducted(false)
    }
    
    if (data.players) {
      const myPlayer = data.players.find(p => p.id === user.uid)
      if (myPlayer) {
        setMyHand(myPlayer.hand || [])
        setIsMyTurn(myPlayer.id === data.currentPlayer)
      }
    }
    
    // Clear selected cards when game state changes
    if (data.gameState === 'playing') {
      setSelectedCards([])
    }
  }

  const createGame = async () => {
    if (!user) return
    
    if (betAmount > (pounds || 0)) {
      toast.error('Not enough pounds to place this bet!')
      return
    }
    
    // Check if there are enough players online
    if (onlinePlayers < 2) {
      toast.error('Need at least 2 players online to create a game. Currently only you are online.')
      return
    }
    
    try {
      const gameRef = doc(collection(db, 'cardGames'))
      const gameData = {
        id: gameRef.id,
        players: [{
          id: user.uid,
          name: user.displayName || user.email,
          hand: [],
          ready: false
        }],
        gameState: 'waiting',
        currentPlayer: null,
        lastPlay: null,
        betAmount,
        createdAt: serverTimestamp(),
        deck: [],
        winner: null
      }
      
      await setDoc(gameRef, gameData)
      setGameId(gameRef.id)
      
      // Don't deduct bet amount when creating - wait until game starts
      // updatePounds(-betAmount)
      
      if (socket) {
        socket.emit('createGame', { gameId: gameRef.id, betAmount })
      }
      
      toast.success('Game created! Waiting for other players to join...')
    } catch (error) {
      console.error('Error creating game:', error)
      toast.error('Failed to create game. Please try again.')
    }
  }

  const joinGame = async (gameId) => {
    if (!user) return
    
    const gameRef = doc(db, 'cardGames', gameId)
    const gameDoc = await getDoc(gameRef)
    
    if (!gameDoc.exists()) {
      toast.error('Game not found')
      return
    }
    
    const gameData = gameDoc.data()
    if (gameData.players.length >= 4) {
      toast.error('Game is full')
      return
    }
    
    if (gameData.betAmount > (pounds || 0)) {
      toast.error('Not enough pounds to join this game!')
      return
    }
    
    const newPlayer = {
      id: user.uid,
      name: user.displayName || user.email,
      hand: [],
      ready: false
    }
    
    await updateDoc(gameRef, {
      players: [...gameData.players, newPlayer]
    })
    
    setGameId(gameId)
    
    // Don't deduct bet amount when joining - wait until game starts
    // updatePounds(-gameData.betAmount)
    
    if (socket) {
      socket.emit('joinGame', { gameId })
    }
  }

  const readyToPlay = async () => {
    if (!gameId || !user) return
    
    const gameRef = doc(db, 'cardGames', gameId)
    const gameDoc = await getDoc(gameRef)
    const gameData = gameDoc.data()
    
    const updatedPlayers = gameData.players.map(player => 
      player.id === user.uid ? { ...player, ready: true } : player
    )
    
    await updateDoc(gameRef, { players: updatedPlayers })
    
    // Check if all players are ready and we have at least 2 players
    const readyPlayers = updatedPlayers.filter(p => p.ready)
    if (readyPlayers.length >= 2 && readyPlayers.length === updatedPlayers.length) {
      startGame(gameData)
    }
  }

  const startGame = async (gameData) => {
    const numPlayers = gameData.players.length
    const numDecks = numPlayers <= 2 ? 1 : 2
    const deck = shuffleDeck(createDeck(numDecks))
    const hands = dealCards(deck, numPlayers)
    
    const updatedPlayers = gameData.players.map((player, index) => ({
      ...player,
      hand: hands[index]
    }))
    
    const firstPlayer = updatedPlayers[Math.floor(Math.random() * numPlayers)]
    
    await updateDoc(doc(db, 'cardGames', gameId), {
      players: updatedPlayers,
      gameState: 'playing',
      currentPlayer: firstPlayer.id,
      deck: deck.slice(numPlayers * Math.floor(deck.length / numPlayers))
    })
    
    // Deduct bet amount when game starts (only once)
    if (!betDeducted) {
      updatePounds(-gameData.betAmount)
      setBetDeducted(true)
    }
    
    if (socket) {
      socket.emit('startGame', { gameId })
    }
  }

  const playCards = async () => {
    if (!isMyTurn || !selectedCards.length || !gameId) return
    
    if (!isValidCombination(selectedCards)) {
      toast.error('Invalid card combination')
      return
    }
    
    if (lastPlay && !canBeat(selectedCards, lastPlay.cards)) {
      toast.error('Your cards must beat the previous play')
      return
    }
    
    const gameRef = doc(db, 'cardGames', gameId)
    const gameDoc = await getDoc(gameRef)
    const gameData = gameDoc.data()
    
    // Remove played cards from hand
    const updatedHand = myHand.filter(card => 
      !selectedCards.some(selected => selected.id === card.id)
    )
    
    const updatedPlayers = gameData.players.map(player => 
      player.id === user.uid ? { ...player, hand: updatedHand } : player
    )
    
    // Find next player
    const currentPlayerIndex = gameData.players.findIndex(p => p.id === gameData.currentPlayer)
    const nextPlayerIndex = (currentPlayerIndex + 1) % gameData.players.length
    const nextPlayer = gameData.players[nextPlayerIndex]
    
    const newLastPlay = {
      playerId: user.uid,
      playerName: user.displayName || user.email,
      cards: selectedCards,
      timestamp: serverTimestamp()
    }
    
    await updateDoc(gameRef, {
      players: updatedPlayers,
      currentPlayer: nextPlayer.id,
      lastPlay: newLastPlay
    })
    
    setSelectedCards([])
    
    // Check for winner
    if (updatedHand.length === 0) {
      await updateDoc(gameRef, {
        gameState: 'finished',
        winner: user.uid
      })
      
      // Distribute winnings
      const totalPot = gameData.betAmount * gameData.players.length
      updatePounds(totalPot)
      toast.success(`Congratulations! You won £${totalPot}!`)
    }
    
    if (socket) {
      socket.emit('playCards', { gameId, cards: selectedCards })
    }
  }

  const pass = async () => {
    if (!isMyTurn || !gameId) return
    
    const gameRef = doc(db, 'cardGames', gameId)
    const gameDoc = await getDoc(gameRef)
    const gameData = gameDoc.data()
    
    // Find next player
    const currentPlayerIndex = gameData.players.findIndex(p => p.id === gameData.currentPlayer)
    const nextPlayerIndex = (currentPlayerIndex + 1) % gameData.players.length
    const nextPlayer = gameData.players[nextPlayerIndex]
    
    await updateDoc(gameRef, {
      currentPlayer: nextPlayer.id
    })
    
    if (socket) {
      socket.emit('pass', { gameId })
    }
  }

  const leaveGame = async () => {
    if (!gameId || !user) return
    
    const gameRef = doc(db, 'cardGames', gameId)
    const gameDoc = await getDoc(gameRef)
    const gameData = gameDoc.data()
    
    // Refund bet if game was in progress and bet was deducted
    if (gameData.gameState === 'playing' && betDeducted) {
      updatePounds(gameData.betAmount)
      toast.success(`Bet refunded: £${gameData.betAmount}`)
    }
    
    // Remove player from game
    const updatedPlayers = gameData.players.filter(p => p.id !== user.uid)
    
    if (updatedPlayers.length === 0) {
      // Delete game if no players left
      await deleteDoc(gameRef)
    } else {
      // Update game with remaining players
      await updateDoc(gameRef, {
        players: updatedPlayers
      })
    }
    
    // Reset game state
    setGameState('lobby')
    setGameId(null)
    setPlayers([])
    setMyHand([])
    setSelectedCards([])
    setLastPlay(null)
    setPassedPlayers([])
    setIsMyTurn(false)
    setWinner(null)
    setBetDeducted(false)
    
    toast.success('Left the game')
  }

  const handleLeaveGameClick = () => {
    setPendingLeaveAction(() => leaveGame)
    setShowLeaveConfirmation(true)
  }

  const selectCard = (card) => {
    if (!isMyTurn) return
    
    const isSelected = selectedCards.some(c => c.id === card.id)
    if (isSelected) {
      setSelectedCards(selectedCards.filter(c => c.id !== card.id))
    } else {
      setSelectedCards([...selectedCards, card])
    }
  }

  const copyGameId = async () => {
    if (gameId) {
      try {
        await navigator.clipboard.writeText(gameId)
        toast.success('Game ID copied to clipboard!')
      } catch (error) {
        console.error('Failed to copy game ID:', error)
        toast.error('Failed to copy game ID')
      }
    }
  }

  // Practice mode functions
  const startPracticeGame = async (numCpuPlayers = 2) => {
    if (!user) return
    
    setIsPracticeMode(true)
    setGameState('waiting')
    
    // Create CPU players
    const shuffledNames = [...CPU_NAMES].sort(() => Math.random() - 0.5)
    const cpuPlayersList = []
    
         for (let i = 0; i < numCpuPlayers; i++) {
       const cpuPlayer = {
         id: `cpu-${i}`,
         name: shuffledNames[i],
         hand: [],
         ready: true,
         isCpu: true
       }
       console.log('Created CPU player:', cpuPlayer)
       cpuPlayersList.push(cpuPlayer)
     }
    
    setCpuPlayers(cpuPlayersList)
    
    // Create player list with user and CPU players
    const allPlayers = [
      {
        id: user.uid,
        name: user.displayName || user.email,
        hand: [],
        ready: false
      },
      ...cpuPlayersList
    ]
    
    setPlayers(allPlayers)
    
    // Don't auto-start - wait for user to click "Ready to Play"
  }

     const startPracticeGameLogic = async (allPlayers) => {
     const numPlayers = allPlayers.length
     const numDecks = numPlayers <= 2 ? 1 : 2
     const deck = shuffleDeck(createDeck(numDecks))
     const hands = dealCards(deck, numPlayers)
     
     console.log('Starting practice game with', numPlayers, 'players')
     console.log('Deck size:', deck.length)
     console.log('Hands:', hands.map(h => h.length))
     console.log('Hands content:', hands)
     
           // Create updated players with hands
      const updatedPlayers = allPlayers.map((player, index) => ({
        ...player,
        hand: hands[index] || [],
        isCpu: player.isCpu || false // Ensure isCpu flag is preserved
      }))
     
           console.log('Updated players with hands:', updatedPlayers)
      console.log('CPU players in updated list:', updatedPlayers.filter(p => p.isCpu))
     
     // Start animation
     setIsShuffling(true)
     setDealtCards([])
     
     // Shuffling animation
     console.log('Shuffling animation started')
     await new Promise(resolve => setTimeout(resolve, 2000))
     setIsShuffling(false)
     setIsDealing(true)
     
     // Deal cards one by one with animation
     const totalCards = deck.length
     const cardsPerPlayer = Math.floor(totalCards / numPlayers)
     
     console.log('Dealing animation started, cards per player:', cardsPerPlayer)
     
     for (let round = 0; round < cardsPerPlayer; round++) {
       for (let playerIndex = 0; playerIndex < numPlayers; playerIndex++) {
         const cardIndex = round * numPlayers + playerIndex
         if (cardIndex < totalCards) {
           const card = deck[cardIndex]
           setDealtCards(prev => [...prev, { card, playerIndex, round }])
           await new Promise(resolve => setTimeout(resolve, 100))
         }
       }
     }
     
     // Wait a moment then set the actual hands
     await new Promise(resolve => setTimeout(resolve, 500))
     setIsDealing(false)
     setDealtCards([])
     
     console.log('Animation completed')
     
     const firstPlayer = updatedPlayers[Math.floor(Math.random() * numPlayers)]
     
     console.log('First player:', firstPlayer.name, 'isCpu:', firstPlayer.isCpu)
     console.log('My hand should be:', updatedPlayers.find(p => p.id === user.uid)?.hand)
     
     // Set all states at once to prevent race conditions
     setPlayers(updatedPlayers)
     setGameState('playing')
     setCurrentPlayer(firstPlayer.id)
     setIsMyTurn(firstPlayer.id === user.uid)
     setPassedPlayers([]) // Reset passed players at game start
     
     // Always set my hand regardless of who goes first
     const myPlayer = updatedPlayers.find(p => p.id === user.uid)
     setMyHand(myPlayer ? myPlayer.hand : [])
     
     console.log('Set my hand to:', myPlayer ? myPlayer.hand : [])
     console.log('First player is CPU:', firstPlayer.isCpu)
     
     // If CPU goes first, make their move
     if (firstPlayer.isCpu) {
       console.log('CPU goes first, starting CPU turn')
       // Use the updatedPlayers data directly instead of relying on state
               setTimeout(() => {
          handleCpuTurn(firstPlayer, updatedPlayers, null, [])
        }, 1000)
     } else {
       console.log('User goes first')
     }
   }

         const handleCpuTurn = async (cpuPlayer, playersData = null, lastPlayData = null, currentPassedPlayers = null) => {
    if (!isPracticeMode || !cpuPlayer.isCpu) return
    
    // Prevent multiple CPU turns from running simultaneously
    if (cpuThinking) {
      console.log('CPU already thinking, skipping turn')
      return
    }
    
    console.log('=== CPU TURN START ===')
    console.log('CPU turn started for:', cpuPlayer.name)
    
    setCpuThinking(true)
    
    // Add a timeout to prevent infinite loops
    const timeout = setTimeout(() => {
      console.log('CPU turn timeout - forcing pass')
      setCpuThinking(false)
      
      const playersToUse = playersData || players
      const currentPlayerIndex = playersToUse.findIndex(p => p.id === cpuPlayer.id)
      const nextPlayerIndex = (currentPlayerIndex + 1) % playersToUse.length
      const nextPlayer = playersToUse[nextPlayerIndex]
      
             const passedPlayersToUse = currentPassedPlayers || passedPlayers
             const newPassedPlayers = [...passedPlayersToUse, cpuPlayer.id]
       
       // Check if all players have passed on this play
       // We need to exclude the player who made the original play from the count
       const originalPlayerId = lastPlayData?.playerId
       const playersWhoCanPass = playersToUse.filter(p => p.id !== originalPlayerId)
       const allPlayersPassed = newPassedPlayers.length === playersWhoCanPass.length
       
       // Debug: Check if this CPU is the original player
       if (cpuPlayer.id === originalPlayerId) {
         console.log('ERROR: CPU timeout - CPU is trying to pass on their own play! This should not happen.')
         console.log('CPU ID:', cpuPlayer.id)
         console.log('Original player ID:', originalPlayerId)
         return
       }
      
             console.log('CPU timeout - Passed players:', newPassedPlayers)
       console.log('CPU timeout - Original player ID:', originalPlayerId)
       console.log('CPU timeout - Players who can pass:', playersWhoCanPass.map(p => p.name))
       console.log('CPU timeout - Total players who can pass:', playersWhoCanPass.length)
       console.log('CPU timeout - All players passed:', allPlayersPassed)
      
      setCurrentPlayer(nextPlayer.id)
      setIsMyTurn(nextPlayer.id === user.uid)
      setPassedPlayers(allPlayersPassed ? [] : newPassedPlayers)
      
      if (allPlayersPassed) {
        setLastPlay(null)
        console.log('CPU timeout - All players passed, resetting lastPlay to null')
      } else {
        console.log('CPU timeout - Not all players passed yet, keeping lastPlay:', lastPlayData?.cards?.map(c => c.value))
      }
      
      setPlayers(playersToUse)
      
             if (nextPlayer.isCpu) {
         setTimeout(() => {
           handleCpuTurn(nextPlayer, playersToUse, allPlayersPassed ? null : lastPlayData, allPlayersPassed ? [] : newPassedPlayers)
         }, 1000)
       }
      
      toast(`${cpuPlayer.name} passed (timeout)`)
    }, 1500) // Reduced timeout to 1.5 seconds
    
    // Simulate thinking time
    await new Promise(resolve => setTimeout(resolve, 1000)) // Reduced thinking time
    
    // Get the current CPU player data
    const playersToUse = playersData || players
    const currentCpuPlayer = playersToUse.find(p => p.id === cpuPlayer.id)
    if (!currentCpuPlayer) {
      console.error('CPU player not found in players state')
      setCpuThinking(false)
      return
    }
    
    const cpuHand = currentCpuPlayer.hand
    console.log('CPU hand:', cpuHand.map(c => c.value))
    
    let bestPlay = null
    
    if (!lastPlayData) {
      // First play - play lowest single card
      console.log('CPU making first play')
      const singles = cpuHand.filter(card => card.value !== 'JOKER')
      if (singles.length > 0) {
        bestPlay = [singles.reduce((lowest, current) => {
          const lowestIndex = CARD_VALUES.indexOf(lowest.value)
          const currentIndex = CARD_VALUES.indexOf(current.value)
          return currentIndex < lowestIndex ? current : lowest
        })]
      } else {
        bestPlay = [cpuHand[0]]
      }
    } else {
      // Responding to a play - find valid play that beats last play
      console.log('CPU responding to last play:', lastPlayData.cards.map(c => c.value))
      
      let validPlays = []
      
      try {
        // Get the last play type
        const lastPlayType = getCombinationType(lastPlayData.cards)
        console.log('Last play type:', lastPlayType)
        
        // Only handle simple combinations - let complex ones fall through to bomb search
        if (lastPlayType === 'single') {
          // For singles, just find a higher single card
          const singles = cpuHand.filter(card => card.value !== 'JOKER')
          for (const card of singles) {
            if (canBeat([card], lastPlayData.cards)) {
              validPlays.push([card])
            }
          }
        } else if (lastPlayType === 'double') {
          // For doubles, find pairs that can beat
          for (let i = 0; i < cpuHand.length - 1; i++) {
            for (let j = i + 1; j < cpuHand.length; j++) {
              const pair = [cpuHand[i], cpuHand[j]]
              if (isValidCombination(pair) && canBeat(pair, lastPlayData.cards)) {
                validPlays.push(pair)
              }
            }
          }
        } else if (lastPlayType === 'triplet') {
          // For triplets, find triplets that can beat
          for (let i = 0; i < cpuHand.length - 2; i++) {
            for (let j = i + 1; j < cpuHand.length - 1; j++) {
              for (let k = j + 1; k < cpuHand.length; k++) {
                const triplet = [cpuHand[i], cpuHand[j], cpuHand[k]]
                if (isValidCombination(triplet) && canBeat(triplet, lastPlayData.cards)) {
                  validPlays.push(triplet)
                }
              }
            }
          }
        }
        
        // If no valid plays found, look for bombs
        if (validPlays.length === 0) {
          console.log('No same-type plays found, looking for bombs')
          
          // Look for 4-card bombs first
          if (cpuHand.length >= 4) {
            // Group cards by value
            const valueGroups = {}
            cpuHand.forEach(card => {
              if (card.value !== 'JOKER') {
                valueGroups[card.value] = valueGroups[card.value] || []
                valueGroups[card.value].push(card)
              }
            })
            
            // Find values with 4 or more cards
            for (const [value, cards] of Object.entries(valueGroups)) {
              if (cards.length >= 4) {
                const bomb = cards.slice(0, 4)
                if (canBeat(bomb, lastPlayData.cards)) {
                  validPlays.push(bomb)
                }
              }
            }
          }
          
          // If still no bombs, look for 5-card bombs
          if (validPlays.length === 0 && cpuHand.length >= 5) {
            const valueGroups = {}
            cpuHand.forEach(card => {
              if (card.value !== 'JOKER') {
                valueGroups[card.value] = valueGroups[card.value] || []
                valueGroups[card.value].push(card)
              }
            })
            
            for (const [value, cards] of Object.entries(valueGroups)) {
              if (cards.length >= 5) {
                const bomb = cards.slice(0, 5)
                if (canBeat(bomb, lastPlayData.cards)) {
                  validPlays.push(bomb)
                }
              }
            }
          }
          
          // If still no bombs, look for 6-card bombs
          if (validPlays.length === 0 && cpuHand.length >= 6) {
            const valueGroups = {}
            cpuHand.forEach(card => {
              if (card.value !== 'JOKER') {
                valueGroups[card.value] = valueGroups[card.value] || []
                valueGroups[card.value].push(card)
              }
            })
            
            for (const [value, cards] of Object.entries(valueGroups)) {
              if (cards.length >= 6) {
                const bomb = cards.slice(0, 6)
                if (canBeat(bomb, lastPlayData.cards)) {
                  validPlays.push(bomb)
                }
              }
            }
          }
        }
        
        console.log('Valid plays found:', validPlays.length)
        
        if (validPlays.length > 0) {
          // Choose lowest play
          bestPlay = validPlays.reduce((lowest, current) => {
            const lowestValue = getCombinationValue(lowest)
            const currentValue = getCombinationValue(current)
            const lowestIndex = CARD_VALUES.indexOf(lowestValue)
            const currentIndex = CARD_VALUES.indexOf(currentValue)
            return currentIndex < lowestIndex ? current : lowest
          }, validPlays[0])
          
          console.log('Selected best play:', bestPlay.map(c => c.value))
        }
      } catch (error) {
        console.error('Error in CPU decision making:', error)
      }
    }
    
    if (bestPlay) {
      // CPU plays cards
      console.log('CPU playing:', bestPlay.map(c => c.value))
      
      // Final validation check - ensure the play is valid
      if (!isValidCombination(bestPlay)) {
        console.error('ERROR: CPU generated invalid combination:', bestPlay.map(c => c.value))
        console.log('CPU will pass instead')
        bestPlay = null
      } else if (lastPlayData && !canBeat(bestPlay, lastPlayData.cards)) {
        console.error('ERROR: CPU generated combination that cannot beat last play')
        console.log('CPU will pass instead')
        bestPlay = null
      }
      
      const updatedHand = cpuHand.filter(card => 
        !bestPlay.some(playedCard => playedCard.id === card.id)
      )
      
      const newLastPlay = {
        playerId: cpuPlayer.id,
        playerName: cpuPlayer.name,
        cards: bestPlay,
        timestamp: new Date()
      }
      
      // Update players with new hand
      const updatedPlayers = playersToUse.map(player => {
        if (player.id === cpuPlayer.id) {
          return { ...player, hand: updatedHand }
        }
        return player
      })
      
      // Find next player
      const currentPlayerIndex = playersToUse.findIndex(p => p.id === cpuPlayer.id)
      const nextPlayerIndex = (currentPlayerIndex + 1) % playersToUse.length
      const nextPlayer = playersToUse[nextPlayerIndex]
      
      // Clear the timeout since we're completing successfully
      clearTimeout(timeout)
      
      // Update all states at once
      setPlayers(updatedPlayers)
      setLastPlay(newLastPlay)
      setCurrentPlayer(nextPlayer.id)
      setIsMyTurn(nextPlayer.id === user.uid)
      setCpuThinking(false)
      setPassedPlayers([])
      
      // Always show my hand if I'm the user
      const myPlayer = updatedPlayers.find(p => p.id === user.uid)
      setMyHand(myPlayer ? myPlayer.hand : [])
      
      // Check for winner
      if (updatedHand.length === 0) {
        setGameState('finished')
        setWinner(cpuPlayer.id)
        toast.success(`${cpuPlayer.name} won the game!`)
        return
      }
      
      // If next player is CPU, continue the turn
      if (nextPlayer.isCpu) {
        console.log('Next player is CPU, starting CPU turn')
        setTimeout(() => {
          handleCpuTurn(nextPlayer, updatedPlayers, newLastPlay, [])
        }, 1000)
      } else {
       console.log('Next player is user, setting turn')
       setIsMyTurn(true)
     }
    } else {
      // CPU passes
      console.log('CPU passing')
      
      const currentPlayerIndex = playersToUse.findIndex(p => p.id === cpuPlayer.id)
      const nextPlayerIndex = (currentPlayerIndex + 1) % playersToUse.length
      const nextPlayer = playersToUse[nextPlayerIndex]
      
             // Add CPU to passed players
       const passedPlayersToUse = currentPassedPlayers || passedPlayers
       const newPassedPlayers = [...passedPlayersToUse, cpuPlayer.id]
       
       // Check if all players have passed on this play
       // We need to exclude the player who made the original play from the count
       const originalPlayerId = lastPlayData?.playerId
       const playersWhoCanPass = playersToUse.filter(p => p.id !== originalPlayerId)
       const allPlayersPassed = newPassedPlayers.length === playersWhoCanPass.length
       
       // Debug: Check if this CPU is the original player
       if (cpuPlayer.id === originalPlayerId) {
         console.log('ERROR: CPU is trying to pass on their own play! This should not happen.')
         console.log('CPU ID:', cpuPlayer.id)
         console.log('Original player ID:', originalPlayerId)
         return
       }
      
             console.log('CPU pass - Passed players:', newPassedPlayers)
       console.log('CPU pass - Original player ID:', originalPlayerId)
       console.log('CPU pass - Players who can pass:', playersWhoCanPass.map(p => p.name))
       console.log('CPU pass - Total players who can pass:', playersWhoCanPass.length)
       console.log('CPU pass - All players passed:', allPlayersPassed)
      
      // Clear the timeout since we're completing successfully
      clearTimeout(timeout)
      
      // Update all states at once
      setCurrentPlayer(nextPlayer.id)
      setIsMyTurn(nextPlayer.id === user.uid)
      setCpuThinking(false)
      setPassedPlayers(allPlayersPassed ? [] : newPassedPlayers)
      
             if (allPlayersPassed) {
         setLastPlay(null)
         console.log('CPU pass - All players passed, resetting lastPlay to null')
       } else {
         console.log('CPU pass - Not all players passed yet, keeping lastPlay:', lastPlayData?.cards?.map(c => c.value))
       }
       
       setPlayers(playersToUse)
       
       // Always show my hand if I'm the user
       const myPlayer = playersToUse.find(p => p.id === user.uid)
       setMyHand(myPlayer ? myPlayer.hand : [])
       
       toast(`${cpuPlayer.name} passed`)
       
       // If next player is CPU, continue the turn
       if (nextPlayer.isCpu) {
         setTimeout(() => {
           const nextLastPlay = allPlayersPassed ? null : lastPlayData
           console.log('CPU pass - Passing to next CPU turn - nextLastPlay:', nextLastPlay ? nextLastPlay.cards.map(c => c.value) : 'null')
           // Pass the updated passedPlayers to the next CPU turn
           handleCpuTurn(nextPlayer, playersToUse, nextLastPlay, allPlayersPassed ? [] : newPassedPlayers)
         }, 1000)
       }
    }
    
    console.log('=== CPU TURN END ===')
  }

     const playCardsPractice = async () => {
     if (!isMyTurn || !selectedCards.length || !isPracticeMode) return
     
     console.log('=== USER PLAY START ===')
     console.log('User playing cards:', selectedCards.map(c => c.value))
     console.log('Last play:', lastPlay?.cards?.map(c => c.value))
     console.log('Current player:', currentPlayer)
     console.log('Is my turn:', isMyTurn)
     
     if (!isValidCombination(selectedCards)) {
       toast.error('Invalid card combination')
       return
     }
     
     console.log('Checking if user play beats last play...')
     console.log('Last play is null:', lastPlay === null)
     console.log('Last play object:', lastPlay)
     if (lastPlay) {
       console.log('Last play cards:', lastPlay.cards.map(c => c.value))
       console.log('User selected cards:', selectedCards.map(c => c.value))
       const canUserBeat = canBeat(selectedCards, lastPlay.cards)
       console.log('Can user beat last play:', canUserBeat)
       if (!canUserBeat) {
         toast.error('Your cards must beat the previous play')
         return
       }
     } else {
       console.log('No last play, user can play any valid combination')
     }
     
     // Remove played cards from hand
     const updatedHand = myHand.filter(card => 
       !selectedCards.some(selected => selected.id === card.id)
     )
     
     console.log('User updated hand:', updatedHand.map(c => c.value))
     console.log('Cards removed:', selectedCards.map(c => c.value))
     console.log('Original hand length:', myHand.length)
     console.log('Updated hand length:', updatedHand.length)
     
     // Update players array with my new hand
     const updatedPlayers = players.map(player => 
       player.id === user.uid ? { ...player, hand: updatedHand } : player
     )
     
     // Find next player
     const currentPlayerIndex = players.findIndex(p => p.id === currentPlayer)
     const nextPlayerIndex = (currentPlayerIndex + 1) % players.length
     const nextPlayer = players[nextPlayerIndex]
     
     console.log('Next player:', nextPlayer.name, 'isCpu:', nextPlayer.isCpu)
     
     const newLastPlay = {
       playerId: user.uid,
       playerName: user.displayName || user.email,
       cards: selectedCards,
       timestamp: new Date()
     }
     
     // Clear selected cards first to prevent visual issues
     setSelectedCards([])
     
     // Update all states at once to prevent race conditions
     setPlayers(updatedPlayers)
     setLastPlay(newLastPlay)
     setCurrentPlayer(nextPlayer.id)
     setIsMyTurn(false)
     setMyHand(updatedHand)
     setPassedPlayers([]) // Reset passed players when someone makes a new play
     
     // Force a re-render to ensure state is updated
     setTimeout(() => {
       console.log('State update verification - My hand after update:', updatedHand.map(c => c.value))
     }, 0)
     
     console.log('States updated - lastPlay set to:', newLastPlay.cards.map(c => c.value))
     console.log('Turn passed to:', nextPlayer.name)
     
     // Check for winner
     if (updatedHand.length === 0) {
       setGameState('finished')
       setWinner(user.uid)
       toast.success('Congratulations! You won!')
       return
     }
     
           // If next player is CPU, handle their turn
      if (nextPlayer.isCpu) {
        console.log('Next player is CPU, starting CPU turn')
        setTimeout(() => {
          handleCpuTurn(nextPlayer, updatedPlayers, newLastPlay, [])
        }, 1000)
      } else {
       console.log('Next player is user, setting turn')
       setIsMyTurn(true)
     }
     
     console.log('=== USER PLAY END ===')
   }

     const passPractice = async () => {
     if (!isMyTurn || !isPracticeMode) return
     
     console.log('=== USER PASS START ===')
     console.log('User passing')
     console.log('Current player:', currentPlayer)
     console.log('Is my turn:', isMyTurn)
     
     // Find next player
     const currentPlayerIndex = players.findIndex(p => p.id === currentPlayer)
     const nextPlayerIndex = (currentPlayerIndex + 1) % players.length
     const nextPlayer = players[nextPlayerIndex]
     
     console.log('Next player:', nextPlayer.name, 'isCpu:', nextPlayer.isCpu)
     
     // Add user to passed players
     const newPassedPlayers = [...passedPlayers, user.uid]
     
     // Check if all players have passed on this play
     // We need to exclude the player who made the original play from the count
     const originalPlayerId = lastPlay?.playerId
     const playersWhoCanPass = players.filter(p => p.id !== originalPlayerId)
     const allPlayersPassed = newPassedPlayers.length === playersWhoCanPass.length
     
     console.log('Passed players:', newPassedPlayers)
     console.log('Original player ID:', originalPlayerId)
     console.log('Players who can pass:', playersWhoCanPass.map(p => p.name))
     console.log('Total players who can pass:', playersWhoCanPass.length)
     console.log('All players passed:', allPlayersPassed)
     
     setCurrentPlayer(nextPlayer.id)
     setIsMyTurn(false)
     setPassedPlayers(allPlayersPassed ? [] : newPassedPlayers) // Reset if all passed, otherwise keep track
     
     // Reset lastPlay only if all players have passed
     if (allPlayersPassed) {
       setLastPlay(null)
       console.log('All players passed, resetting lastPlay to null')
     } else {
       console.log('Not all players passed yet, keeping lastPlay:', lastPlay?.cards?.map(c => c.value))
     }
     
     toast('You passed')
     
     // If next player is CPU, handle their turn
     if (nextPlayer.isCpu) {
       console.log('Next player is CPU, starting CPU turn after pass')
       setTimeout(() => {
         // Pass the appropriate lastPlay (null if all passed, otherwise the original)
         const nextLastPlay = allPlayersPassed ? null : lastPlay
         console.log('Passing to CPU turn - nextLastPlay:', nextLastPlay ? nextLastPlay.cards.map(c => c.value) : 'null')
         handleCpuTurn(nextPlayer, players, nextLastPlay, allPlayersPassed ? [] : newPassedPlayers)
       }, 1000)
     } else {
       console.log('Next player is user, setting turn after pass')
       setIsMyTurn(true)
       // Make sure my hand is still visible
       const myPlayer = players.find(p => p.id === user.uid)
       console.log('User pass - My hand before update:', myPlayer ? myPlayer.hand.map(c => c.value) : [])
       setMyHand(myPlayer ? myPlayer.hand : [])
     }
     
     console.log('=== USER PASS END ===')
   }

  const readyToPlayPractice = async () => {
    if (!isPracticeMode) return
    
    // Mark user as ready
    const updatedPlayers = players.map(player => 
      player.id === user.uid ? { ...player, ready: true } : player
    )
    setPlayers(updatedPlayers)
    
    // Start the practice game immediately
    await startPracticeGameLogic(updatedPlayers)
  }

  const leavePracticeGame = () => {
    setIsPracticeMode(false)
    setGameState('lobby')
    setPlayers([])
    setCpuPlayers([])
    setMyHand([])
    setSelectedCards([])
    setLastPlay(null)
    setPassedPlayers([])
    setIsMyTurn(false)
    setWinner(null)
    setCurrentPlayer(null)
    setCpuThinking(false)
    setGameId(null)
    
    toast.success('Left practice game')
  }

  const handleLeavePracticeGameClick = () => {
    setPendingLeaveAction(() => leavePracticeGame)
    setShowLeaveConfirmation(true)
  }



  const getCardColor = (suit) => {
    return suit === '♥' || suit === '♦' ? 'text-red-600' : 'text-black'
  }

  const renderCard = (card, isSelected = false) => {
    return (
      <motion.div
        key={card.id}
        whileHover={{ y: -10 }}
        whileTap={{ scale: 0.95 }}
        className={`relative w-16 h-24 bg-white rounded-lg shadow-lg border-2 cursor-pointer transition-all ${
          isSelected ? 'border-blue-500 transform -translate-y-2' : 'border-gray-300'
        }`}
        onClick={() => selectCard(card)}
      >
        <div className={`absolute top-1 left-1 text-sm font-bold ${getCardColor(card.suit)}`}>
          {card.value}
        </div>
        <div className={`absolute bottom-1 right-1 text-sm font-bold ${getCardColor(card.suit)}`}>
          {card.suit}
        </div>
        {card.value === 'JOKER' && (
          <div className="absolute inset-0 flex items-center justify-center text-2xl">
            🃏
          </div>
        )}
      </motion.div>
    )
  }

  if (!mounted) return null

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-5xl font-script text-yellow-400 mb-4 drop-shadow-lg">
              🃏 Big 2 🃏
            </h1>
            <p className="text-white text-lg mb-6">
              Get rid of all your cards to win!
            </p>
            
            {/* Currency and Online Players Display */}
            {mounted && (
              <div className="flex justify-center gap-8 mb-6">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <FaCoins className="text-xl" />
                    <span className="text-2xl font-bold">{pounds || 0}</span>
                  </div>
                  <p className="text-white text-sm">Pounds (£)</p>
                </div>
                
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
                  <div className="flex items-center gap-2 text-green-400">
                    <FaWifi className="text-xl" />
                    <span className="text-2xl font-bold">{onlinePlayers}</span>
                  </div>
                  <p className="text-white text-sm">Online Players</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Game Content */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8">
                         {gameState === 'lobby' && (
               <div>
                 <h2 className="text-2xl font-bold text-white mb-6 text-center">Game Lobby</h2>
                 
                 {/* Practice Mode Section */}
                 <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-6 mb-6">
                   <h3 className="text-xl font-bold text-white mb-4">🎯 Practice Mode (vs CPU)</h3>
                   <p className="text-blue-200 text-sm mb-4">
                     Learn the game mechanics by playing against computer opponents. No betting required!
                   </p>
                   <div className="flex gap-4">
                     <button
                       onClick={() => startPracticeGame(1)}
                       className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition"
                     >
                       <FaPlay className="inline mr-2" />
                       vs 1 CPU
                     </button>
                     <button
                       onClick={() => startPracticeGame(2)}
                       className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition"
                     >
                       <FaPlay className="inline mr-2" />
                       vs 2 CPUs
                     </button>
                     <button
                       onClick={() => startPracticeGame(3)}
                       className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition"
                     >
                       <FaPlay className="inline mr-2" />
                       vs 3 CPUs
                     </button>
                   </div>
                 </div>
                 
                 {/* Player Count Warning */}
                 {onlinePlayers < 2 && (
                   <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-6">
                     <div className="flex items-center gap-2 text-yellow-300">
                       <FaUsers className="text-xl" />
                       <span className="font-semibold">Not enough players online</span>
                     </div>
                     <p className="text-yellow-200 text-sm mt-1">
                       You need at least 2 players online to create or join a game. 
                       Currently only {onlinePlayers} player{onlinePlayers !== 1 ? 's' : ''} online.
                     </p>
                     <p className="text-yellow-200 text-sm mt-2">
                       💡 <strong>Testing tip:</strong> Open this page in another browser tab/window to test multiplayer!
                     </p>
                   </div>
                 )}
                 
                 {/* Create Game Section */}
                 <div className="bg-white/10 rounded-lg p-6 mb-6">
                   <h3 className="text-xl font-bold text-white mb-4">Create New Game</h3>
                   <div className="flex items-center gap-4 mb-4">
                     <label className="text-white">Bet Amount (£):</label>
                     <input
                       type="number"
                       min="0.50"
                       max="100"
                       step="0.50"
                       value={betAmount}
                       onChange={(e) => setBetAmount(parseFloat(e.target.value))}
                       className="w-32 px-4 py-2 rounded-lg text-center"
                     />
                   </div>
                   <button
                     onClick={createGame}
                     disabled={onlinePlayers < 2}
                     className={`font-bold py-3 px-6 rounded-lg transition ${
                       onlinePlayers < 2 
                         ? 'bg-gray-500 cursor-not-allowed text-gray-300' 
                         : 'bg-green-500 hover:bg-green-600 text-white'
                     }`}
                   >
                     <FaPlay className="inline mr-2" />
                     {onlinePlayers < 2 ? 'Need More Players' : 'Create Game'}
                   </button>
                   {onlinePlayers < 2 && (
                     <p className="text-yellow-300 text-sm mt-2">
                       Need at least 2 players online to create a game
                     </p>
                   )}
                 </div>

                {/* Available Games Section */}
                <div className="bg-white/10 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Join Available Games</h3>
                  {availableGames.length === 0 ? (
                    <p className="text-white/80 text-center py-4">
                      {onlinePlayers < 2 
                        ? 'No games available. Need more players online!' 
                        : 'No games available. Create one above!'
                      }
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {availableGames.map((game) => (
                        <div key={game.id} className="bg-white/20 rounded-lg p-4 flex justify-between items-center">
                          <div>
                            <p className="text-white font-semibold">Game ID: {game.id}</p>
                            <p className="text-white/80">Players: {game.players.length}/4</p>
                            <p className="text-white/80">Bet: £{game.betAmount}</p>
                          </div>
                          <button
                            onClick={() => joinGame(game.id)}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition"
                          >
                            Join Game
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Join by Game ID */}
                <div className="bg-white/10 rounded-lg p-6 mt-6">
                  <h3 className="text-xl font-bold text-white mb-4">Join by Game ID</h3>
                  <div className="flex gap-4">
                    <input
                      type="text"
                      placeholder="Enter Game ID"
                      value={joinGameId}
                      onChange={(e) => setJoinGameId(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-lg"
                    />
                    <button
                      onClick={() => joinGame(joinGameId)}
                      disabled={!joinGameId}
                      className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition"
                    >
                      Join
                    </button>
                  </div>
                </div>
              </div>
            )}

                         {gameState === 'waiting' && (
               <div className="text-center">
                 <h2 className="text-2xl font-bold text-white mb-6">
                   {isPracticeMode ? 'Practice Game Setup' : 'Waiting for Players'}
                 </h2>
                 
                 {/* Game Info */}
                 <div className="bg-white/10 rounded-lg p-6 mb-6">
                   {!isPracticeMode && (
                     <>
                       <div className="flex items-center justify-center gap-2 mb-4">
                         <p className="text-white">Game ID: <span className="font-mono bg-white/20 px-2 py-1 rounded">{gameId}</span></p>
                         <button
                           onClick={copyGameId}
                           className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded"
                         >
                           Copy
                         </button>
                       </div>
                       <p className="text-white mb-4">Bet Amount: £{betAmount}</p>
                     </>
                   )}
                   <p className="text-white mb-4">Players ({players.length}/4):</p>
                   
                   {/* Player List */}
                   <div className="flex justify-center gap-4 mb-6">
                     {players.map((player, index) => (
                       <div key={player.id} className="bg-white/20 rounded-lg p-4 min-w-[150px]">
                         <div className="flex items-center gap-2">
                           <FaUsers className="text-yellow-400" />
                           <span className="text-white text-sm">{player.name}</span>
                           {player.ready && <FaCheck className="text-green-400" />}
                         </div>
                         <div className="text-xs text-white/70 mt-1">
                           {player.ready ? 'Ready' : 'Not Ready'}
                         </div>
                       </div>
                     ))}
                   </div>
                   
                   {/* Waiting Status - Only show for non-practice mode */}
                   {!isPracticeMode && (
                     <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-4">
                       <div className="flex items-center gap-2 text-yellow-300">
                         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-300"></div>
                         <span className="font-semibold">Waiting for more players...</span>
                       </div>
                       <p className="text-yellow-200 text-sm mt-1">
                         Need at least 2 players to start. Share the Game ID with friends!
                       </p>
                     </div>
                   )}
                 </div>
                
                                 {/* Ready Button */}
                 {players.find(p => p.id === user.uid)?.ready ? (
                   <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-4">
                     <div className="flex items-center gap-2 text-green-300">
                       <FaCheck className="text-green-400" />
                       <span className="font-semibold">You're ready to play!</span>
                     </div>
                     <p className="text-green-200 text-sm mt-1">
                       {isPracticeMode ? 'Starting practice game...' : 'Waiting for other players to get ready...'}
                     </p>
                   </div>
                 ) : (
                   <button
                     onClick={isPracticeMode ? readyToPlayPractice : readyToPlay}
                     className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition mb-4"
                   >
                     Ready to Play
                   </button>
                 )}
                
                                 {/* Action Buttons */}
                 <div className="space-y-2">
                   <button
                     onClick={isPracticeMode ? handleLeavePracticeGameClick : handleLeaveGameClick}
                     className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition"
                   >
                     {isPracticeMode ? 'Leave Practice Game' : 'Leave Game'}
                   </button>
                 </div>
              </div>
            )}

                         {gameState === 'playing' && (
               <div>
                 <div className="mb-6">
                   <h2 className="text-2xl font-bold text-white mb-4">
                     {isPracticeMode ? 'Practice Game' : 'Game in Progress'}
                   </h2>
                   <div className="flex justify-between items-center mb-4">
                     <div className="text-white">
                       Current Player: {players.find(p => p.id === currentPlayer)?.name}
                       {players.find(p => p.id === currentPlayer)?.isCpu && ' 🤖'}
                     </div>
                     <div className="text-white">
                       {isMyTurn && <span className="text-green-400 font-bold">Your turn!</span>}
                       {!isMyTurn && players.find(p => p.id === currentPlayer)?.isCpu && (
                         <span className="text-blue-400 font-bold">
                           {cpuThinking ? '🤖 CPU is thinking...' : '🤖 CPU turn'}
                         </span>
                       )}
                     </div>
                   </div>
                 </div>

                                   {/* Shuffling Animation */}
                  {isShuffling && (
                    <div className="mb-8">
                      <div className="bg-green-800/50 rounded-xl p-8 border-2 border-green-600/30">
                        <div className="text-center">
                          <div className="text-6xl mb-4 animate-bounce">🃏</div>
                          <h3 className="text-white text-xl font-semibold mb-2">Shuffling Cards...</h3>
                          <div className="flex justify-center gap-2">
                            {[...Array(5)].map((_, i) => (
                              <motion.div
                                key={i}
                                animate={{ 
                                  rotate: [0, 360],
                                  scale: [1, 1.2, 1]
                                }}
                                transition={{ 
                                  duration: 1,
                                  repeat: Infinity,
                                  delay: i * 0.1
                                }}
                                className="w-12 h-16 bg-white rounded-lg shadow-lg border-2 border-gray-300"
                              >
                                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                  <span className="text-white text-xs">♠</span>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dealing Animation */}
                  {isDealing && (
                    <div className="mb-8">
                      <div className="bg-green-800/50 rounded-xl p-8 border-2 border-green-600/30">
                        <div className="text-center">
                          <h3 className="text-white text-xl font-semibold mb-4">Dealing Cards...</h3>
                          <div className="flex justify-center items-center min-h-[120px]">
                            <div className="flex gap-2">
                              {dealtCards.map(({ card, playerIndex, round }, index) => (
                                <motion.div
                                  key={`${card.id}-${index}`}
                                  initial={{ 
                                    x: 0, 
                                    y: 0, 
                                    scale: 0,
                                    rotate: -180
                                  }}
                                  animate={{ 
                                    x: (playerIndex - 1) * 100,
                                    y: playerIndex === 0 ? -50 : 50,
                                    scale: 1,
                                    rotate: 0
                                  }}
                                  transition={{ 
                                    duration: 0.5,
                                    delay: index * 0.1,
                                    type: "spring"
                                  }}
                                  className="relative w-16 h-24 bg-white rounded-lg shadow-lg border-2 border-gray-300"
                                >
                                  <div className={`absolute top-1 left-1 text-sm font-bold ${getCardColor(card.suit)}`}>
                                    {card.value}
                                  </div>
                                  <div className={`absolute bottom-1 right-1 text-sm font-bold ${getCardColor(card.suit)}`}>
                                    {card.suit}
                                  </div>
                                  {card.value === 'JOKER' && (
                                    <div className="absolute inset-0 flex items-center justify-center text-2xl">
                                      🃏
                                    </div>
                                  )}
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Game Table - Cards in the Middle */}
                  {!isShuffling && !isDealing && (
                    <div className="mb-8">
                      <div className="bg-green-800/50 rounded-xl p-8 border-2 border-green-600/30">
                        <div className="text-center mb-4">
                          <h3 className="text-white text-lg font-semibold">Game Table</h3>
                          {lastPlay && (
                            <p className="text-white/80 text-sm">
                              Last played by {lastPlay.playerName}
                            </p>
                          )}
                        </div>
                        
                        {/* Cards in the middle */}
                        <div className="flex justify-center items-center min-h-[120px]">
                          {lastPlay ? (
                            <div className="flex gap-2">
                              {lastPlay.cards.map(card => (
                                <motion.div
                                  key={card.id}
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ duration: 0.5, type: "spring" }}
                                  className="relative w-16 h-24 bg-white rounded-lg shadow-lg border-2 border-gray-300"
                                >
                                  <div className={`absolute top-1 left-1 text-sm font-bold ${getCardColor(card.suit)}`}>
                                    {card.value}
                                  </div>
                                  <div className={`absolute bottom-1 right-1 text-sm font-bold ${getCardColor(card.suit)}`}>
                                    {card.suit}
                                  </div>
                                  {card.value === 'JOKER' && (
                                    <div className="absolute inset-0 flex items-center justify-center text-2xl">
                                      🃏
                                    </div>
                                  )}
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-white/50 text-center">
                              <div className="text-4xl mb-2">🃏</div>
                              <p>No cards played yet</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Player turn indicator */}
                        <div className="text-center mt-4">
                          <div className="inline-block bg-white/20 rounded-full px-4 py-2">
                            <span className="text-white font-semibold">
                              {isMyTurn ? 'Your turn!' : `Waiting for ${players.find(p => p.id === currentPlayer)?.name}...`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                                   {/* My Hand */}
                  {!isShuffling && !isDealing && (
                    <div className="mb-6">
                      <h3 className="text-white mb-4">Your Hand ({myHand.length} cards):</h3>
                      <div className="flex flex-wrap gap-2">
                        {myHand.map(card => renderCard(card, selectedCards.some(c => c.id === card.id)))}
                      </div>
                    </div>
                  )}

                  {/* Game Actions */}
                  {!isShuffling && !isDealing && isMyTurn && (
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={isPracticeMode ? playCardsPractice : playCards}
                        disabled={!selectedCards.length}
                        className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition"
                      >
                        Play Cards
                      </button>
                      <button
                        onClick={isPracticeMode ? passPractice : pass}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition"
                      >
                        Pass
                      </button>
                    </div>
                  )}
                 <div className="flex justify-center mt-4">
                   <button
                     onClick={isPracticeMode ? handleLeavePracticeGameClick : handleLeaveGameClick}
                     className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition"
                   >
                     {isPracticeMode ? 'Leave Practice Game' : 'Leave Game'}
                   </button>
                 </div>
               </div>
             )}

                         {gameState === 'finished' && (
               <div className="text-center">
                 <h2 className="text-2xl font-bold text-white mb-6">
                   {isPracticeMode ? 'Practice Game Finished!' : 'Game Finished!'}
                 </h2>
                 {winner && (
                   <div className="mb-6">
                     <p className="text-white text-lg">
                       Winner: {players.find(p => p.id === winner)?.name}
                       {players.find(p => p.id === winner)?.isCpu && ' 🤖'}
                     </p>
                     {winner === user.uid && (
                       <p className="text-green-400 text-xl font-bold">
                         {isPracticeMode 
                           ? 'Congratulations! You won the practice game!' 
                           : `Congratulations! You won £${betAmount * players.length}!`
                         }
                       </p>
                     )}
                     {winner !== user.uid && players.find(p => p.id === winner)?.isCpu && (
                       <p className="text-blue-400 text-lg">
                         The CPU won this time. Try again to improve your skills!
                       </p>
                     )}
                   </div>
                 )}
                 <div className="flex justify-center gap-4">
                   {isPracticeMode ? (
                     <>
                       <button
                         onClick={() => {
                           setIsPracticeMode(false)
                           setGameState('lobby')
                           setPlayers([])
                           setCpuPlayers([])
                           setMyHand([])
                           setSelectedCards([])
                           setLastPlay(null)
                           setPassedPlayers([])
                           setIsMyTurn(false)
                           setWinner(null)
                           setCurrentPlayer(null)
                           setCpuThinking(false)
                           setGameId(null)
                         }}
                         className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition"
                       >
                         Play Again
                       </button>
                       <button
                         onClick={() => {
                           setIsPracticeMode(false)
                           setGameState('lobby')
                           setPlayers([])
                           setCpuPlayers([])
                           setMyHand([])
                           setSelectedCards([])
                           setLastPlay(null)
                           setPassedPlayers([])
                           setIsMyTurn(false)
                           setWinner(null)
                           setCurrentPlayer(null)
                           setCpuThinking(false)
                           setGameId(null)
                         }}
                         className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition"
                       >
                         Back to Lobby
                       </button>
                     </>
                   ) : (
                     <Link
                       href="/casino"
                       className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition"
                     >
                       Back to Casino
                     </Link>
                   )}
                 </div>
               </div>
             )}
          </div>

          {/* Navigation */}
          <div className="flex justify-center gap-4 mt-8">
            <Link
              href="/casino"
              className="bg-white/20 hover:bg-white/30 text-white font-semibold px-6 py-3 rounded-2xl transition backdrop-blur-sm"
            >
              ← Back to Casino
            </Link>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLeaveConfirmation}
        onClose={() => setShowLeaveConfirmation(false)}
        onConfirm={() => {
          if (pendingLeaveAction) {
            pendingLeaveAction()
          }
        }}
        title="Leave Game?"
        message="Are you sure you want to leave the game? This action cannot be undone."
        confirmText="Leave Game"
        cancelText="Stay"
        confirmColor="bg-red-500 hover:bg-red-600"
        cancelColor="bg-gray-500 hover:bg-gray-600"
      />
    </ProtectedRoute>
  )
}

