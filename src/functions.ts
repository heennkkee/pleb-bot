export const formatMilliSeconds = (millseconds: number) => {
    let seconds = Math.floor(millseconds / 1000);
    let hours = Math.floor(seconds / 3600);
    let minutes = Math.floor((seconds - hours * 3600) / 60);
    seconds = seconds - minutes * 60 - hours * 3600;

    return `${hours > 0 ? hours + 'h' : ''}${minutes > 0 ? minutes + 'm' : ''}${seconds > 0 ? seconds + 's' : ''}`
}