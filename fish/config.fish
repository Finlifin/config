if status is-interactive
    alias s "startplasma-wayland"
    alias sb "sudo helix /sys/class/backlight/amdgpu_bl0/brightness"
    alias :q "exit"
    alias update "paru && stack update && rustup update"
    alias hx "helix"
    alias vim "env -u WAYLAND_DISPLAY neovide"
    alias nv "WINIT_UNIX_BACKEND=x11 neovide"
    alias run "stack runhaskell"

    fish_add_path -g ~/.nix-profile/bin/
    fish_add_path -g /opt/servo
    fish_add_path -g /home/fin/.local/bin
    fish_add_path -g /home/fin/some_js/scripting
    fish_add_path -g /home/fin/some_julia/scripting
    export LD_LIBRARY_PATH=/lib
     
    # Commands to run in interactive sessions can go here
end
