import {ZZFX, zzfx} from 'zzfx'

// you can use https://killedbyapixel.github.io/ZzFX/ to generate sfx

export const playExplosionSFX = ()=> {
    if (Math.random() >=.5){
        zzfx(...[1.01,,690,.02,.3,.55,4,3.03,.8,,,,,1.8,,.2,,.5,.12,.11])
    } else {
        zzfx(...[1.02,,203,.05,.06,.52,2,4.16,.3,.4,,,,1.7,,.4,,.32,.14])
    }
}

export const playPickupSoundPaddleExtension = () => {
    zzfx(...[1.17,,28,.03,.04,.08,,.52,9.3,1.3,,,,1,,,.01,.9,.07]);
}

export const playPickupSoundExtraLife = () => {
    zzfx(...[1.04,,53,,.27,.47,2,1.9,,,,,.08,.1,,.2,,.64,.21,.09]);
}

export const playPickupSoundBonusScore = () => {
    zzfx(...[,,1532,,.08,.15,,1.51,,,,,,,,,,.53,.02]);
}