// Reference implementation from Pseudo-Corp/SynergismOfficial (MIT).
// Commit fc9f007ca (game 4.4.1), Calculate.ts and Helper.ts.
// Kept separate from the mod so tests do not mirror its income equations.
/*
MIT License

Copyright (c) 2019-2025 Platonic and Khafra

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

export const calculatePurpleReactantRecipe = () => {
  const conversionMultiplier = getPurpleAmbrosiaUpgradeEffects('scorpio', 'purpleReactorConversionMult')
  return {
    ambrosiaBarPoints: purpleReactantConversion.ambrosiaBarPoints * conversionMultiplier,
    redAmbrosiaBarPoints: purpleReactantConversion.redAmbrosiaBarPoints,
    purpleBarPoints: purpleReactantConversion.purpleBarPoints * conversionMultiplier
      * getPurpleAmbrosiaUpgradeEffects('aries', 'universalBarPointMult')
  }
}

export const calculatePurpleReactantConversion = (
  ambrosiaBarPoints: number,
  redAmbrosiaBarPoints: number,
  ambrosiaBarPointsRequested: number
) => {
  const recipe = calculatePurpleReactantRecipe()
  const ambrosiaBatches = ambrosiaBarPoints / recipe.ambrosiaBarPoints
  const redAmbrosiaBatches = redAmbrosiaBarPoints / recipe.redAmbrosiaBarPoints
  const conversionBatches = Math.min(
    ambrosiaBatches,
    redAmbrosiaBatches,
    ambrosiaBarPointsRequested / recipe.ambrosiaBarPoints
  )

  return {
    // Consume the limiting input exactly, without leaving a floating-point remainder.
    ambrosiaBarPointsSpent: conversionBatches === ambrosiaBatches
      ? ambrosiaBarPoints
      : conversionBatches * recipe.ambrosiaBarPoints,
    redAmbrosiaBarPointsSpent: conversionBatches === redAmbrosiaBatches
      ? redAmbrosiaBarPoints
      : conversionBatches * recipe.redAmbrosiaBarPoints,
    purpleBarPointsGained: conversionBatches * recipe.purpleBarPoints
  }
}

export const calculatePurpleOverflowConversion = (ambrosiaBarPoints: number, redAmbrosiaBarPoints: number) => {
  const reaction = calculatePurpleReactantConversion(ambrosiaBarPoints, redAmbrosiaBarPoints, ambrosiaBarPoints)
  return {
    ...reaction,
    purpleBarPointsGained: reaction.purpleBarPointsGained * PURPLE_REACTOR_OVERFLOW_EFFICIENCY
  }
}

const isPurpleReactorOverflowEnabled = () =>
  player.encabulatorOvercapToggle && getPurpleAmbrosiaUpgradeEffects('libra', 'overcapToggleUnlocked')

/**
 * Reacts each tank's held excess against the other tank's remaining stock. This must run after
 * the main reaction, so overflow only uses stock the Encabulator did not consume.
 * Any unmatched excess is refunded to its regular bar.
 */
export const calculatePurpleOverflowResolution = (
  ambrosiaExcessBarPoints: number,
  redAmbrosiaExcessBarPoints: number,
  storedAmbrosiaBarPoints: number,
  storedRedAmbrosiaBarPoints: number
) => {
  if (!isPurpleReactorOverflowEnabled()) {
    return {
      ambrosiaOverflowBarPoints: 0,
      redAmbrosiaOverflowBarPoints: 0,
      storedAmbrosiaBarPointsSpent: 0,
      storedRedAmbrosiaBarPointsSpent: 0,
      ambrosiaRefundBarPoints: ambrosiaExcessBarPoints,
      redAmbrosiaRefundBarPoints: redAmbrosiaExcessBarPoints,
      purpleBarPointsGained: 0
    }
  }

  const ambrosiaReaction = calculatePurpleOverflowConversion(ambrosiaExcessBarPoints, storedRedAmbrosiaBarPoints)
  const redAmbrosiaReaction = calculatePurpleOverflowConversion(storedAmbrosiaBarPoints, redAmbrosiaExcessBarPoints)

  return {
    ambrosiaOverflowBarPoints: ambrosiaReaction.ambrosiaBarPointsSpent,
    redAmbrosiaOverflowBarPoints: redAmbrosiaReaction.redAmbrosiaBarPointsSpent,
    storedAmbrosiaBarPointsSpent: redAmbrosiaReaction.ambrosiaBarPointsSpent,
    storedRedAmbrosiaBarPointsSpent: ambrosiaReaction.redAmbrosiaBarPointsSpent,
    ambrosiaRefundBarPoints: Math.max(0, ambrosiaExcessBarPoints - ambrosiaReaction.ambrosiaBarPointsSpent),
    redAmbrosiaRefundBarPoints: Math.max(0, redAmbrosiaExcessBarPoints - redAmbrosiaReaction.redAmbrosiaBarPointsSpent),
    purpleBarPointsGained: ambrosiaReaction.purpleBarPointsGained + redAmbrosiaReaction.purpleBarPointsGained
  }
}

/**
 * Routes Bar Points into a reactant tank. Bar Points routed to a full tank are returned as excess;
 * the caller either holds them for overflow or refunds them to the regular bar.
 */
export const calculatePurpleReactantRouting = (
  productionPerSecond: number,
  reservePercentage: number,
  storedBarPoints: number,
  capacity: number,
  elapsedSeconds: number
) => {
  const clampedStored = Math.min(capacity, storedBarPoints)
  const clampedReservePercentage = Math.min(100, Math.max(0, reservePercentage))
  const producedBarPoints = productionPerSecond * elapsedSeconds
  const requestedReserveBarPoints = clampedReservePercentage === 100
    ? producedBarPoints
    : producedBarPoints * clampedReservePercentage / 100
  const reservedBarPoints = Math.min(requestedReserveBarPoints, capacity - clampedStored)
  const unroundedRegularBarPoints = producedBarPoints - requestedReserveBarPoints
  const roundingTolerance = 16 * Number.EPSILON * Math.max(1, Math.abs(producedBarPoints))
  const regularBarPoints = Math.abs(unroundedRegularBarPoints) <= roundingTolerance
    ? 0
    : unroundedRegularBarPoints

  return {
    storedBarPoints: clampedStored + reservedBarPoints,
    reservedBarPoints,
    excessBarPoints: Math.max(0, requestedReserveBarPoints - reservedBarPoints),
    regularBarPoints
  }
}

export const calculatePurpleHoneyPerExtraction = () => allPurpleHoneyEfficiencyStatsSum()

export const calculateBarEXALTPurpleFillChance = () => 1 - Math.pow(2, -calculatePurpleHoneyRewardLuck() / 100)

export const calculatePurpleHoneyExtractionMultiplier = (luck: number) => {
  const guaranteedMultiplier = Math.floor(luck / 100)
  return {
    guaranteedMultiplier,
    bonusMultiplierChance: luck / 100 - guaranteedMultiplier
  }
}


const awardAmbrosiaBarFill = (globalSpeedMult?: () => number) => {
  const ambrosiaLuck = calculateAmbrosiaRewardLuck()
  const RNG = seededRandom(Seed.Ambrosia)
  const ambrosiaMult = Math.floor(ambrosiaLuck / 100)
  const luckMult = RNG < ambrosiaLuck / 100 - Math.floor(ambrosiaLuck / 100) ? 1 : 0
  const bonusAmbrosia = getSingularityChallengeEffect('noAmbrosiaUpgrades', 'bonusAmbrosia')
  const ambrosiaToGain = (ambrosiaMult + luckMult) + bonusAmbrosia

  if (player.singularityChallenges.barDependence.enabled) {
    addTimers('prestige', ambrosiaToGain * 0.01, globalSpeedMult, true)
    addTimers('transcension', ambrosiaToGain * 0.01, globalSpeedMult, true)
    addTimers('reincarnation', ambrosiaToGain * 0.01, globalSpeedMult, true)
    addTimers('autoPotion', ambrosiaToGain * 0.01, globalSpeedMult, true)
  } else {
    player.ambrosia += ambrosiaToGain
    player.lifetimeAmbrosia += ambrosiaToGain
  }
  player.purpleHoneyProgress += getPurpleAmbrosiaUpgradeEffects('cancer', 'purpleBarPointsOnFill')
}

/**
 * @returns Ambrosia Bar Points granted by Red Ambrosia Accelerator
 */
const awardRedAmbrosiaBarFill = () => {
  const baseRedLuck = calculateRedAmbrosiaLuck()
  const redAmbrosiaLuck = calculateRedAmbrosiaRewardLuck(baseRedLuck)
  const RNG = seededRandom(Seed.RedAmbrosia)
  const redAmbrosiaMult = Math.floor(redAmbrosiaLuck / 100)
  const luckMult = RNG < redAmbrosiaLuck / 100 - Math.floor(redAmbrosiaLuck / 100) ? 1 : 0
  const redAmbrosiaToGain = redAmbrosiaMult + luckMult

  if (player.singularityChallenges.barDependence.enabled) {
    addTimers('ascension', redAmbrosiaToGain * 0.05, undefined, true)
  } else {
    player.redAmbrosia += redAmbrosiaToGain
    player.lifetimeRedAmbrosia += redAmbrosiaToGain
  }
  player.purpleHoneyProgress += getPurpleAmbrosiaUpgradeEffects('cancer', 'purpleBarPointsOnFill')

  // Red-Blue Ultrafusion uses base Red Luck, not TWO MIND reward luck
  const acceleratorMult = Math.floor(baseRedLuck / 100)
    + (RNG < baseRedLuck / 100 - Math.floor(baseRedLuck / 100) ? 1 : 0)
  const acceleratorSeconds = acceleratorMult
    * getRedAmbrosiaUpgradeEffects('redAmbrosiaAccelerator', 'ambrosiaTimePerRedAmbrosia')
  return Math.min(redAmbrosiaAcceleratorMaxBarPoints, calculateAmbrosiaBarPointsGenerated(acceleratorSeconds))
}

const gainAmbrosia = (globalSpeedMult?: () => number) => {
  if (player.singularityChallenges.noSingularityUpgrades.completions === 0) {
    return
  }

  let timeToAmbrosia = calculateRequiredBlueberryTime()

  while (player.blueberryTime >= timeToAmbrosia) {
    awardAmbrosiaBarFill(globalSpeedMult)
    player.blueberryTime -= timeToAmbrosia
    timeToAmbrosia = calculateRequiredBlueberryTime()
  }
}

/**
 * Converts Red Ambrosia Bar Points into Red Ambrosia.
 * @returns Ambrosia Bar Points granted by Red Ambrosia Accelerator
 */
const gainRedAmbrosia = () => {
  if (player.singularityChallenges.noAmbrosiaUpgrades.completions === 0) {
    return 0
  }

  let timeToRedAmbrosia = calculateRequiredRedAmbrosiaTime()
  let ambrosiaBarPointsToGrant = 0

  while (player.redAmbrosiaTime >= timeToRedAmbrosia) {
    ambrosiaBarPointsToGrant += awardRedAmbrosiaBarFill()
    player.redAmbrosiaTime -= timeToRedAmbrosia
    timeToRedAmbrosia = calculateRequiredRedAmbrosiaTime()
  }

  return ambrosiaBarPointsToGrant
}

/**
 * Routes Bar Points into their tanks, runs the main reaction, and then reacts any excess against the
 * stock left over. Bar Points that are not reacted go to the regular Ambrosia/Red Ambrosia bars.
 * @returns Purple Bar Points gained
 */
const reactPurpleReactants = (
  ambrosiaBarPoints: number,
  redAmbrosiaBarPoints: number,
  reactionSeconds: number
) => {
  const ambrosiaRouting = calculatePurpleReactantRouting(
    ambrosiaBarPoints,
    player.purpleReactor.ambrosiaBarPointPercentage,
    player.purpleReactor.storedAmbrosiaBarPoints,
    calculatePurpleReactantCapacity(),
    1
  )
  const redAmbrosiaRouting = calculatePurpleReactantRouting(
    redAmbrosiaBarPoints,
    player.purpleReactor.redAmbrosiaBarPointPercentage,
    player.purpleReactor.storedRedAmbrosiaBarPoints,
    calculateRedAmbrosiaReactantCapacity(),
    1
  )

  const reaction = calculatePurpleReactantConversion(
    ambrosiaRouting.storedBarPoints,
    redAmbrosiaRouting.storedBarPoints,
    calculatePurpleReactantCapacity() * calculateEncabulatorSpeed() / 100 / 3600 * reactionSeconds
  )
  const ambrosiaAfterReaction = Math.max(0, ambrosiaRouting.storedBarPoints - reaction.ambrosiaBarPointsSpent)
  const redAmbrosiaAfterReaction = Math.max(0, redAmbrosiaRouting.storedBarPoints - reaction.redAmbrosiaBarPointsSpent)

  // Overflow reacts only with stock the main reaction did not consume.
  const overflow = calculatePurpleOverflowResolution(
    ambrosiaRouting.excessBarPoints,
    redAmbrosiaRouting.excessBarPoints,
    ambrosiaAfterReaction,
    redAmbrosiaAfterReaction
  )

  player.purpleReactor.storedAmbrosiaBarPoints = Math.max(
    0,
    ambrosiaAfterReaction - overflow.storedAmbrosiaBarPointsSpent
  )
  player.purpleReactor.storedRedAmbrosiaBarPoints = Math.max(
    0,
    redAmbrosiaAfterReaction - overflow.storedRedAmbrosiaBarPointsSpent
  )
  player.blueberryTime += ambrosiaRouting.regularBarPoints + overflow.ambrosiaRefundBarPoints
  player.redAmbrosiaTime += redAmbrosiaRouting.regularBarPoints + overflow.redAmbrosiaRefundBarPoints

  return reaction.purpleBarPointsGained + overflow.purpleBarPointsGained
}

const calculateAmbrosiaBarPointsGenerated = (seconds: number) =>
  seconds > 0 && player.singularityChallenges.noSingularityUpgrades.completions > 0
    ? calculateAmbrosiaGenerationSpeed() * seconds
    : 0

const calculateRedAmbrosiaBarPointsGenerated = (seconds: number) =>
  seconds > 0 && player.singularityChallenges.noAmbrosiaUpgrades.completions > 0
    ? calculateRedAmbrosiaGenerationSpeed() * seconds
    : 0

const redAmbrosiaAcceleratorMaxBarPoints = 80_000_000

/**
 * Runs the Chroma-Encabulator in one pass, then converts full bars into Ambrosia/Red Ambrosia.
 * Every source of Bar Points is routed through the tanks first.
 * @param ambrosiaSeconds seconds of Ambrosia Bar Point generation
 * @param redAmbrosiaSeconds seconds of Red Ambrosia Bar Point generation
 * @param reactionSeconds seconds of Encabulator reaction
 */
export const runPurpleReactor = (
  ambrosiaSeconds: number,
  redAmbrosiaSeconds: number,
  reactionSeconds: number,
  globalSpeedMult?: () => number
) => {
  const purpleBarPointsGained = reactPurpleReactants(
    calculateAmbrosiaBarPointsGenerated(ambrosiaSeconds),
    calculateRedAmbrosiaBarPointsGenerated(redAmbrosiaSeconds),
    reactionSeconds
  )

  const conversionFactor = calculatePurpleHoneyConversionFactor()
  const purpleHoneyProgress = player.purpleHoneyProgress + purpleBarPointsGained
  const completedExtractions = Math.floor(purpleHoneyProgress / conversionFactor)
  const { guaranteedMultiplier, bonusMultiplierChance } = calculatePurpleHoneyExtractionMultiplier(
    calculatePurpleHoneyRewardLuck()
  )
  let bonusExtractions = 0

  if (bonusMultiplierChance > 0) {
    let extractionsToLoop = completedExtractions
    if (completedExtractions > 100) {
      const hundredBundles = Math.floor(completedExtractions / 100)
      extractionsToLoop %= 100
      bonusExtractions = Math.floor(bonusMultiplierChance * 100 * hundredBundles)
    }
    for (let i = 0; i < extractionsToLoop; i++) {
      if (seededRandom(Seed.PurpleHoney) < bonusMultiplierChance) {
        bonusExtractions++
      }
    }
  }

  const purpleHoneyExtracted = completedExtractions * guaranteedMultiplier + bonusExtractions
  const purpleHoneyGained = purpleHoneyExtracted * calculatePurpleHoneyPerExtraction()

  player.purpleHoneyProgress = purpleHoneyProgress % conversionFactor

  const ambrosiaBarPointsRebated = completedExtractions * (
    getPurpleAmbrosiaUpgradeEffects('gemini', 'ambrosiaBarPointsOnFill')
    + getShopUpgradeEffects('shopPurpleBarRebate', 'ambrosiaBarPointsPerFill')
  )
  const redAmbrosiaBarPointsRebated = completedExtractions * (
    getPurpleAmbrosiaUpgradeEffects('gemini', 'redAmbrosiaBarPointsOnFill')
    + getShopUpgradeEffects('shopPurpleBarRebate', 'redAmbrosiaBarPointsPerFill')
  )
  let ambrosiaBarPointsToGrant = 0

  if (completedExtractions > 0) {
    if (player.singularityChallenges.barDependence.enabled) {
      const fillChance = calculateBarEXALTPurpleFillChance()
      for (let i = 0; i < completedExtractions; i++) {
        if (
          player.singularityChallenges.noSingularityUpgrades.completions > 0
          && seededRandom(Seed.PurpleHoney) < fillChance
        ) {
          awardAmbrosiaBarFill(globalSpeedMult)
        }
        if (
          player.singularityChallenges.noAmbrosiaUpgrades.completions > 0
          && seededRandom(Seed.PurpleHoney) < fillChance
        ) {
          ambrosiaBarPointsToGrant += awardRedAmbrosiaBarFill()
        }
      }
    } else {
      player.purpleReactor.purpleHoney += purpleHoneyGained
      player.purpleReactor.lifetimePurpleHoney += purpleHoneyGained
      animatePurpleHoneyGain(purpleHoneyGained)
      player.stats.highestPurpleHoney = Math.max(
        player.stats.highestPurpleHoney,
        player.purpleReactor.purpleHoney
      )
      if (player.singularityCounter >= 3600 && !player.singularityChallenges.barDependence.enabled) {
        const quarksToAdd = purpleHoneyGained
          * getPurpleReactorUpgradeEffects('purpleQuarkGain', 'quarksPerPurpleHoney')
        player.worlds.add(quarksToAdd, true, true)
      }
    }
  }

  // Bar Points granted after the reaction are routed without reacting again. Purple Bar Points from
  // their overflow count toward the next extraction, which keeps this pass from feeding itself.
  if (ambrosiaBarPointsRebated > 0 || redAmbrosiaBarPointsRebated > 0) {
    player.purpleHoneyProgress += reactPurpleReactants(ambrosiaBarPointsRebated, redAmbrosiaBarPointsRebated, 0)
  }

  gainAmbrosia(globalSpeedMult)
  ambrosiaBarPointsToGrant += gainRedAmbrosia()
  if (ambrosiaBarPointsToGrant > 0) {
    player.purpleHoneyProgress += reactPurpleReactants(ambrosiaBarPointsToGrant, 0, 0)
    gainAmbrosia(globalSpeedMult)
  }
}
