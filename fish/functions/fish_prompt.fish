function fish_prompt
    if test -n "$SSH_TTY"
        echo -n (set_color brred)"$USER"(set_color white)'@'(set_color yellow)(prompt_hostname)' '
    end

    set_color -o
    echo -n (set_color white)'/--------------\
    '

    if fish_is_root_user
        echo -n (set_color red)'# '
    end
    echo (set_color white)(prompt_pwd)
    echo -n '\--------------/'' ' (set_color white)' ❱ '
    set_color normal
end
