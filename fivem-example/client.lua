local open = false

local function setOpen(state)
    open = state
    SetNuiFocus(state, state)
    SendNUIMessage({ action = state and 'open' or 'hide' })
end

-- /adn ouvre le terminal. Appelez aussi : exports['adn-scanner']:Open()
RegisterCommand('adn', function() setOpen(not open) end, false)

exports('Open', function() setOpen(true) end)
exports('Close', function() setOpen(false) end)

-- Le terminal (iframe) prévient le jeu quand le joueur ferme la fenêtre
RegisterNUICallback('close', function(_, cb)
    open = false
    SetNuiFocus(false, false)
    cb('ok')
end)

AddEventHandler('onResourceStop', function(res)
    if res == GetCurrentResourceName() then SetNuiFocus(false, false) end
end)
